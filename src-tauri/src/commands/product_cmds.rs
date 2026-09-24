use crate::database::db::AppState;
use crate::models::product::{Brand, Category, PaginatedProducts, Product, ProductFilter, Unit};
use crate::security::auth::validate_permission;
use sqlx::Row;
use uuid::Uuid;

#[tauri::command]
pub async fn get_categories(
    token: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Category>, String> {
    validate_permission(&state.db, &token, "products.view").await?;

    let records = sqlx::query_as::<_, Category>(
        "SELECT id, name_en, name_si FROM categories ORDER BY name_en ASC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
pub async fn create_category(
    token: String,
    name_en: String,
    name_si: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Category, String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;
    let id = Uuid::new_v4().to_string();

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO categories (id, name_en, name_si) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&name_en)
        .bind(&name_si)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE', 'CATEGORY', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(Category { id, name_en, name_si })
}

#[tauri::command]
pub async fn update_category(
    token: String,
    id: String,
    name_en: String,
    name_si: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Category, String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let rows_affected = sqlx::query("UPDATE categories SET name_en = ?, name_si = ? WHERE id = ?")
        .bind(&name_en)
        .bind(&name_si)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err("Category not found".into());
    }

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'UPDATE', 'CATEGORY', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(Category { id, name_en, name_si })
}

#[tauri::command]
pub async fn delete_category(
    token: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // Check if category is used
    let count: (i64,) = sqlx::query_as("SELECT count(*) FROM products WHERE category_id = ?")
        .bind(&id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if count.0 > 0 {
        return Err("Cannot delete category because it is used in products".into());
    }

    let rows_affected = sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err("Category not found".into());
    }

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'DELETE', 'CATEGORY', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_brands(
    token: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Brand>, String> {
    validate_permission(&state.db, &token, "products.view").await?;

    let records = sqlx::query_as::<_, Brand>(
        "SELECT id, name_en, name_si FROM brands ORDER BY name_en ASC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
pub async fn create_brand(
    token: String,
    name_en: String,
    name_si: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Brand, String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;
    let id = Uuid::new_v4().to_string();

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO brands (id, name_en, name_si) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&name_en)
        .bind(&name_si)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE', 'BRAND', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(Brand { id, name_en, name_si })
}

#[tauri::command]
pub async fn update_brand(
    token: String,
    id: String,
    name_en: String,
    name_si: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Brand, String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let rows_affected = sqlx::query("UPDATE brands SET name_en = ?, name_si = ? WHERE id = ?")
        .bind(&name_en)
        .bind(&name_si)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err("Brand not found".into());
    }

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'UPDATE', 'BRAND', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(Brand { id, name_en, name_si })
}

#[tauri::command]
pub async fn delete_brand(
    token: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let count: (i64,) = sqlx::query_as("SELECT count(*) FROM products WHERE brand_id = ?")
        .bind(&id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if count.0 > 0 {
        return Err("Cannot delete brand because it is used in products".into());
    }

    let rows_affected = sqlx::query("DELETE FROM brands WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err("Brand not found".into());
    }

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'DELETE', 'BRAND', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_units(
    token: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Unit>, String> {
    validate_permission(&state.db, &token, "products.view").await?;

    let records = sqlx::query_as::<_, Unit>(
        "SELECT id, name_en, name_si, abbreviation FROM units ORDER BY name_en ASC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
pub async fn create_unit(
    token: String,
    name_en: String,
    name_si: Option<String>,
    abbreviation: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Unit, String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;
    let id = Uuid::new_v4().to_string();

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO units (id, name_en, name_si, abbreviation) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(&name_en)
        .bind(&name_si)
        .bind(&abbreviation)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE', 'UNIT', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(Unit { id, name_en, name_si, abbreviation })
}

#[tauri::command]
pub async fn update_unit(
    token: String,
    id: String,
    name_en: String,
    name_si: Option<String>,
    abbreviation: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<Unit, String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let rows_affected = sqlx::query("UPDATE units SET name_en = ?, name_si = ?, abbreviation = ? WHERE id = ?")
        .bind(&name_en)
        .bind(&name_si)
        .bind(&abbreviation)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err("Unit not found".into());
    }

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'UPDATE', 'UNIT', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(Unit { id, name_en, name_si, abbreviation })
}

#[tauri::command]
pub async fn delete_unit(
    token: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let count: (i64,) = sqlx::query_as("SELECT count(*) FROM products WHERE unit_id = ?")
        .bind(&id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if count.0 > 0 {
        return Err("Cannot delete unit because it is used in products".into());
    }

    let rows_affected = sqlx::query("DELETE FROM units WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err("Unit not found".into());
    }

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'DELETE', 'UNIT', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_product(
    token: String,
    product: Product,
    state: tauri::State<'_, AppState>,
) -> Result<Product, String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;
    let id = Uuid::new_v4().to_string();

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO products (
            id, sku, barcode, name_en, name_si, category_id, brand_id, unit_id, 
            cost_price, selling_price, wholesale_price, tax_rate, discount_amount, 
            minimum_stock, current_stock, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&product.sku)
    .bind(&product.barcode)
    .bind(&product.name_en)
    .bind(&product.name_si)
    .bind(&product.category_id)
    .bind(&product.brand_id)
    .bind(&product.unit_id)
    .bind(product.cost_price)
    .bind(product.selling_price)
    .bind(product.wholesale_price)
    .bind(product.tax_rate)
    .bind(product.discount_amount)
    .bind(product.minimum_stock)
    .bind(product.current_stock)
    .bind(&product.status)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        if e.to_string().contains("UNIQUE constraint failed: products.barcode") {
            "Barcode already exists".to_string()
        } else if e.to_string().contains("UNIQUE constraint failed: products.sku") {
            "SKU already exists".to_string()
        } else {
            e.to_string()
        }
    })?;

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE', 'PRODUCT', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    let mut new_product = product;
    new_product.id = id;
    Ok(new_product)
}

#[tauri::command]
pub async fn get_products(
    token: String,
    filter: ProductFilter,
    state: tauri::State<'_, AppState>,
) -> Result<PaginatedProducts, String> {
    validate_permission(&state.db, &token, "products.view").await?;

    let mut query = String::from("SELECT id, sku, barcode, name_en, name_si, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, tax_rate, discount_amount, minimum_stock, current_stock, status FROM products WHERE 1=1");
    let mut count_query = String::from("SELECT count(*) FROM products WHERE 1=1");
    
    // Simplistic query builder for Sqlite (in a real app we'd use QueryBuilder)
    // To avoid complex dynamic bindings in raw sqlx here, we'll fetch all matching filters
    // A proper implementation would use `sqlx::QueryBuilder`. 
    // Since this is embedded SQLite for POS, we will use QueryBuilder for safety.
    
    let mut qb = sqlx::QueryBuilder::new("SELECT id, sku, barcode, name_en, name_si, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, tax_rate, discount_amount, minimum_stock, current_stock, status FROM products WHERE 1=1 ");
    let mut count_qb = sqlx::QueryBuilder::new("SELECT count(*) FROM products WHERE 1=1 ");

    if let Some(s) = &filter.search {
        let search_term = format!("%{}%", s);
        qb.push(" AND (name_en LIKE ");
        qb.push_bind(search_term.clone());
        qb.push(" OR name_si LIKE ");
        qb.push_bind(search_term.clone());
        qb.push(" OR barcode LIKE ");
        qb.push_bind(search_term.clone());
        qb.push(" OR sku LIKE ");
        qb.push_bind(search_term.clone());
        qb.push(") ");

        count_qb.push(" AND (name_en LIKE ");
        count_qb.push_bind(search_term.clone());
        count_qb.push(" OR name_si LIKE ");
        count_qb.push_bind(search_term.clone());
        count_qb.push(" OR barcode LIKE ");
        count_qb.push_bind(search_term.clone());
        count_qb.push(" OR sku LIKE ");
        count_qb.push_bind(search_term.clone());
        count_qb.push(") ");
    }

    if let Some(cat) = &filter.category_id {
        qb.push(" AND category_id = ");
        qb.push_bind(cat);
        count_qb.push(" AND category_id = ");
        count_qb.push_bind(cat);
    }

    if let Some(brand) = &filter.brand_id {
        qb.push(" AND brand_id = ");
        qb.push_bind(brand);
        count_qb.push(" AND brand_id = ");
        count_qb.push_bind(brand);
    }

    if let Some(status) = &filter.status {
        qb.push(" AND status = ");
        qb.push_bind(status);
        count_qb.push(" AND status = ");
        count_qb.push_bind(status);
    }

    qb.push(" ORDER BY name_en ASC LIMIT ");
    qb.push_bind(filter.limit);
    qb.push(" OFFSET ");
    qb.push_bind(filter.offset);

    let count: (i64,) = count_qb.build_query_as().fetch_one(&state.db).await.map_err(|e| e.to_string())?;
    
    // Fetch products and manually map since struct contains optional fields
    let products_records = qb.build().fetch_all(&state.db).await.map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for r in products_records {
        items.push(Product {
            id: r.get("id"),
            sku: r.try_get("sku").ok(),
            barcode: r.try_get("barcode").ok(),
            name_en: r.get("name_en"),
            name_si: r.try_get("name_si").ok(),
            category_id: r.try_get("category_id").ok(),
            brand_id: r.try_get("brand_id").ok(),
            unit_id: r.try_get("unit_id").ok(),
            cost_price: r.get("cost_price"),
            selling_price: r.get("selling_price"),
            wholesale_price: r.try_get("wholesale_price").ok(),
            tax_rate: r.get("tax_rate"),
            discount_amount: r.get("discount_amount"),
            minimum_stock: r.get("minimum_stock"),
            current_stock: r.get("current_stock"),
            status: r.get("status"),
        });
    }

    Ok(PaginatedProducts {
        items,
        total: count.0,
    })
}

#[tauri::command]
pub async fn get_product(
    token: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Product, String> {
    validate_permission(&state.db, &token, "products.view").await?;

    let product = sqlx::query_as::<_, Product>(
        "SELECT id, sku, barcode, name_en, name_si, category_id, brand_id, unit_id, 
         cost_price, selling_price, wholesale_price, tax_rate, discount_amount, 
         minimum_stock, current_stock, status
         FROM products WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    match product {
        Some(p) => Ok(p),
        None => Err("Product not found".into()),
    }
}

#[tauri::command]
pub async fn update_product(
    token: String,
    product: Product,
    state: tauri::State<'_, AppState>,
) -> Result<Product, String> {
    let user_id = validate_permission(&state.db, &token, "products.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let rows_affected = sqlx::query(
        "UPDATE products SET 
            sku = ?, barcode = ?, name_en = ?, name_si = ?, category_id = ?, 
            brand_id = ?, unit_id = ?, cost_price = ?, selling_price = ?, 
            wholesale_price = ?, tax_rate = ?, discount_amount = ?, 
            minimum_stock = ?, current_stock = ?, status = ?
         WHERE id = ?"
    )
    .bind(&product.sku)
    .bind(&product.barcode)
    .bind(&product.name_en)
    .bind(&product.name_si)
    .bind(&product.category_id)
    .bind(&product.brand_id)
    .bind(&product.unit_id)
    .bind(&product.cost_price)
    .bind(&product.selling_price)
    .bind(&product.wholesale_price)
    .bind(&product.tax_rate)
    .bind(&product.discount_amount)
    .bind(&product.minimum_stock)
    .bind(&product.current_stock)
    .bind(&product.status)
    .bind(&product.id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .rows_affected();

    if rows_affected == 0 {
        return Err("Product not found".into());
    }

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'UPDATE', 'PRODUCT', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&product.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(product)
}
