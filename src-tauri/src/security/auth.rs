use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand::{distributions::Alphanumeric, Rng};

pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string();
    Ok(password_hash)
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

pub fn generate_session_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(64)
        .map(char::from)
        .collect()
}

pub async fn validate_permission(
    db: &sqlx::SqlitePool,
    token: &str,
    required_permission: &str,
) -> Result<String, String> {
    let row = sqlx::query(
        "SELECT s.user_id FROM sessions s
         JOIN users u ON s.user_id = u.id
         JOIN role_permissions rp ON u.role_id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE s.token = ? AND p.name = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'ACTIVE'"
    )
    .bind(token)
    .bind(required_permission)
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?;

    match row {
        Some(r) => {
            let user_id: String = sqlx::Row::get(&r, "user_id");
            Ok(user_id)
        }
        None => Err("Unauthorized or session expired".into()),
    }
}
