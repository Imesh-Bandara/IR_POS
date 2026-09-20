use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::fs;
use std::path::PathBuf;

pub struct AppState {
    pub db: SqlitePool,
}

pub async fn init_db(app_data_dir: PathBuf) -> Result<SqlitePool, sqlx::Error> {
    // Create database directory if it doesn't exist
    let db_path = app_data_dir.join("irpos.db");
    
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
    }

    let database_url = format!("sqlite:{}", db_path.to_string_lossy());
    
    // Create the database file if it doesn't exist
    if !db_path.exists() {
        std::fs::File::create(&db_path).expect("Failed to create database file");
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}
