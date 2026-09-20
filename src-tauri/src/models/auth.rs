use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct User {
    pub id: String,
    pub username: String,
    pub role_id: String,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LoginResponse {
    pub token: String,
    pub user: User,
    pub permissions: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SetupPayload {
    pub business_name: String,
    pub address: String,
    pub phone: String,
    pub email: String,
    pub language: String,
    pub currency: String,
    pub timezone: String,
    pub admin_username: String,
    pub admin_password: String,
}
