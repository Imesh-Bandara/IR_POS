#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::db::{init_db, AppState};
    use crate::models::auth::SetupPayload;
    use crate::security::auth::{hash_password, verify_password};
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::query(include_str!("../../../migrations/20260920000000_initial_schema.sql")).execute(&pool).await.unwrap();
        sqlx::query(include_str!("../../../migrations/20260920010000_authentication.sql")).execute(&pool).await.unwrap();
        pool
    }

    #[test]
    fn test_password_hashing() {
        let pw = "my_secure_password";
        let hash = hash_password(pw).unwrap();
        assert!(verify_password(pw, &hash));
        assert!(!verify_password("wrong_password", &hash));
    }
}
