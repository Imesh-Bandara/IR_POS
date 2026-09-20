use crate::database::db::AppState;
use crate::models::auth::{LoginResponse, SetupPayload, User};
use crate::security::auth::{generate_session_token, hash_password, verify_password};
use chrono::{Duration, Utc};
use sqlx::Row;
use uuid::Uuid;

#[tauri::command]
pub async fn check_is_first_run(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(count.0 == 0)
}

#[tauri::command]
pub async fn setup_first_run(
    payload: SetupPayload,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // Create Business
    let business_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO businesses (id, name, address, phone, email) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&business_id)
    .bind(&payload.business_name)
    .bind(&payload.address)
    .bind(&payload.phone)
    .bind(&payload.email)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Default Branch
    let branch_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO branches (id, business_id, name) VALUES (?, ?, 'Main Branch')")
        .bind(&branch_id)
        .bind(&business_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Default Terminal
    let terminal_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO terminals (id, branch_id, name) VALUES (?, ?, 'Terminal 01')")
        .bind(&terminal_id)
        .bind(&branch_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Admin User
    let hashed_pw = hash_password(&payload.admin_password).map_err(|e| e.to_string())?;
    let user_id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO users (id, username, password_hash, role_id) VALUES (?, ?, ?, 'role_admin')",
    )
    .bind(&user_id)
    .bind(&payload.admin_username)
    .bind(&hashed_pw)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Settings
    let settings = vec![
        ("localization", "language", payload.language),
        ("localization", "currency", payload.currency),
        ("localization", "timezone", payload.timezone),
    ];

    for (sec, key, val) in settings {
        sqlx::query("INSERT INTO settings (section, key, value) VALUES (?, ?, ?)")
            .bind(sec)
            .bind(key)
            .bind(val)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Audit Log
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'SYSTEM_INIT', 'SYSTEM', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&business_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn login(
    username: String,
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<LoginResponse, String> {
    let user_record = sqlx::query("SELECT id, username, password_hash, role_id, status FROM users WHERE username = ? COLLATE NOCASE")
        .bind(&username)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = user_record {
        let status: String = row.get("status");
        if status != "ACTIVE" {
            return Err("Account is inactive".into());
        }

        let hash: String = row.get("password_hash");
        if verify_password(&password, &hash) {
            let user_id: String = row.get("id");
            let token = generate_session_token();
            let session_id = Uuid::new_v4().to_string();
            let expires = Utc::now() + Duration::hours(12);

            // Store session
            sqlx::query("INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)")
                .bind(&session_id)
                .bind(&user_id)
                .bind(&token)
                .bind(expires.to_rfc3339())
                .execute(&state.db)
                .await
                .map_err(|e| e.to_string())?;

            // Audit
            let log_id = Uuid::new_v4().to_string();
            let _ = sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type) VALUES (?, ?, 'LOGIN', 'SESSION')")
                .bind(&log_id)
                .bind(&user_id)
                .execute(&state.db)
                .await;

            // Fetch Permissions
            let role_id: String = row.get("role_id");
            let perms_records = sqlx::query("SELECT p.name FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?")
                .bind(&role_id)
                .fetch_all(&state.db)
                .await
                .map_err(|e| e.to_string())?;

            let permissions: Vec<String> = perms_records.into_iter().map(|r| r.get("name")).collect();

            return Ok(LoginResponse {
                token,
                user: User {
                    id: user_id,
                    username: row.get("username"),
                    role_id,
                    status,
                },
                permissions,
            });
        }
    }

    Err("Invalid username or password".into())
}

#[tauri::command]
pub async fn check_session(
    token: String,
    state: tauri::State<'_, AppState>,
) -> Result<LoginResponse, String> {
    let session_record = sqlx::query("SELECT user_id, expires_at FROM sessions WHERE token = ?")
        .bind(&token)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = session_record {
        let expires_at_str: String = row.get("expires_at");
        if let Ok(expires_at) = chrono::DateTime::parse_from_rfc3339(&expires_at_str) {
            if expires_at.with_timezone(&Utc) > Utc::now() {
                let user_id: String = row.get("user_id");
                
                let user_row = sqlx::query("SELECT username, role_id, status FROM users WHERE id = ?")
                    .bind(&user_id)
                    .fetch_one(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;
                
                let role_id: String = user_row.get("role_id");
                
                let perms_records = sqlx::query("SELECT p.name FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?")
                    .bind(&role_id)
                    .fetch_all(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;

                let permissions: Vec<String> = perms_records.into_iter().map(|r| r.get("name")).collect();

                return Ok(LoginResponse {
                    token,
                    user: User {
                        id: user_id,
                        username: user_row.get("username"),
                        role_id,
                        status: user_row.get("status"),
                    },
                    permissions,
                });
            }
        }
        // If expired, delete it
        let _ = sqlx::query("DELETE FROM sessions WHERE token = ?")
            .bind(&token)
            .execute(&state.db)
            .await;
    }
    
    Err("Invalid or expired session".into())
}

#[tauri::command]
pub async fn logout(token: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    // Find session for audit log
    if let Ok(Some(row)) = sqlx::query("SELECT user_id FROM sessions WHERE token = ?").bind(&token).fetch_optional(&state.db).await {
        let user_id: String = row.get("user_id");
        let log_id = Uuid::new_v4().to_string();
        let _ = sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type) VALUES (?, ?, 'LOGOUT', 'SESSION')")
            .bind(&log_id)
            .bind(&user_id)
            .execute(&state.db)
            .await;
    }

    sqlx::query("DELETE FROM sessions WHERE token = ?")
        .bind(&token)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(())
}
