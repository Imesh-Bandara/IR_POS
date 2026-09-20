fn main() {
    let password = "123456";
    let hash = tauri_app_lib::security::auth::hash_password(password).unwrap();
    println!("HASH: {}", hash);
}
