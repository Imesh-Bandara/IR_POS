use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::fs;
use std::path::{Path, PathBuf};

pub struct AppState {
    pub db: SqlitePool,
}

pub fn ensure_app_data_layout(app_data_dir: &Path) -> (PathBuf, PathBuf, PathBuf) {
    let database_dir = app_data_dir.join("database");
    let backups_dir = app_data_dir.join("backups");
    let logs_dir = app_data_dir.join("logs");

    for dir in [&database_dir, &backups_dir, &logs_dir] {
        if !dir.exists() {
            fs::create_dir_all(dir).expect("Failed to create application data directory");
        }
    }

    let preferred_db = database_dir.join("irpos.db");
    let legacy_db = app_data_dir.join("irpos.db");
    let db_path = if preferred_db.exists() {
        preferred_db
    } else if legacy_db.exists() {
        legacy_db
    } else {
        preferred_db
    };

    (db_path, backups_dir, logs_dir)
}

pub async fn init_db(app_data_dir: PathBuf) -> Result<SqlitePool, sqlx::Error> {
    let (db_path, _, _) = ensure_app_data_layout(&app_data_dir);

    if !db_path.exists() {
        std::fs::File::create(&db_path).expect("Failed to create database file");
    }

    let database_url = format!("sqlite:{}", db_path.to_string_lossy());
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}
