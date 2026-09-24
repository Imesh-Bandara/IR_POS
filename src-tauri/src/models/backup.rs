use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct BackupMetadata {
    pub id: String,
    pub app_version: String,
    pub schema_version: String,
    pub created_at: NaiveDateTime,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestorePreview {
    pub metadata: Option<BackupMetadata>,
    pub is_valid: bool,
    pub error_message: Option<String>,
}
