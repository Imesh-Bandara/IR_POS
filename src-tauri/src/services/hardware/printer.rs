use sqlx::SqlitePool;
use tokio::net::TcpStream;
use tokio::io::AsyncWriteExt;
use std::time::Duration;
use crate::models::sales::{Sale, SaleItem, Payment};
use sqlx::Row;

// Standard ESC/POS commands
const ESC_INIT: &[u8] = b"\x1B\x40";
const ESC_ALIGN_CENTER: &[u8] = b"\x1B\x61\x01";
const ESC_ALIGN_LEFT: &[u8] = b"\x1B\x61\x00";
const ESC_BOLD_ON: &[u8] = b"\x1B\x45\x01";
const ESC_BOLD_OFF: &[u8] = b"\x1B\x45\x00";
const ESC_CUT: &[u8] = b"\x1D\x56\x41\x03"; // Partial cut

pub async fn print_receipt_by_invoice(
    db: &SqlitePool,
    invoice_number: &str,
) -> Result<(), String> {
    // 1. Check settings to see if printer is enabled
    let enabled_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_enabled'")
        .fetch_optional(db).await.map_err(|e| e.to_string())?;
        
    let is_enabled = match enabled_row {
        Some(row) => {
            let val: String = row.get("value");
            val == "true"
        },
        None => false
    };

    if !is_enabled {
        return Err("Receipt printer is disabled in settings.".into());
    }

    let conn_type_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_connection'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let conn_type: String = conn_type_row.get("value");

    if conn_type != "LAN" {
        // Fallback for USB/Unsupported
        return Err(format!("Connection type {} is not natively supported yet. Only LAN (TCP) ESC/POS printers are supported.", conn_type));
    }

    let ip_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_ip'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let ip: String = ip_row.get("value");

    let port_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_port'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let port: String = port_row.get("value");

    let address = format!("{}:{}", ip, port);

    // 2. Fetch Invoice Data
    let sale = sqlx::query_as::<_, Sale>(
        "SELECT id, invoice_number, cashier_id, customer_id, status, subtotal, discount_total, tax_total, grand_total, datetime(created_at, 'localtime') as created_at FROM sales WHERE invoice_number = ?"
    )
    .bind(invoice_number)
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Sale not found".to_string())?;

    let items = sqlx::query_as::<_, SaleItem>(
        "SELECT si.id, si.sale_id, si.product_id, p.name_en, p.sku, p.barcode, si.quantity, si.unit_price, si.discount_amount, si.tax_amount, si.subtotal, si.total, 0 as returned_quantity
         FROM sale_items si 
         JOIN products p ON si.product_id = p.id 
         WHERE si.sale_id = ?"
    )
    .bind(&sale.id)
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?;
    
    let payments = sqlx::query_as::<_, Payment>(
        "SELECT id, payment_method, amount_expected, amount_received, change_returned, status, datetime(created_at, 'localtime') as created_at FROM payments WHERE sale_id = ?"
    )
    .bind(&sale.id)
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?;

    // Generate Payload
    let payload = generate_escpos_receipt(&sale, &items, &payments);

    // Send Payload with timeout
    send_to_printer(&address, &payload).await?;

    Ok(())
}

pub async fn test_print(db: &SqlitePool) -> Result<(), String> {
    let conn_type_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_connection'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let conn_type: String = conn_type_row.get("value");

    if conn_type != "LAN" {
        return Err(format!("Connection type {} is not natively supported for test print.", conn_type));
    }

    let ip_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_ip'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let ip: String = ip_row.get("value");

    let port_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_port'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let port: String = port_row.get("value");

    let address = format!("{}:{}", ip, port);

    let mut payload = Vec::new();
    payload.extend_from_slice(ESC_INIT);
    payload.extend_from_slice(ESC_ALIGN_CENTER);
    payload.extend_from_slice(ESC_BOLD_ON);
    payload.extend_from_slice(b"========================\n");
    payload.extend_from_slice(b"       IR POS\n");
    payload.extend_from_slice(b"      TEST PRINT\n");
    payload.extend_from_slice(b"========================\n");
    payload.extend_from_slice(ESC_BOLD_OFF);
    payload.extend_from_slice(ESC_ALIGN_LEFT);
    payload.extend_from_slice(format!("Connection: {}\n", address).as_bytes());
    payload.extend_from_slice(b"Hardware test successful\n");
    payload.extend_from_slice(b"========================\n");
    payload.extend_from_slice(b"\n\n\n\n");
    payload.extend_from_slice(ESC_CUT);

    send_to_printer(&address, &payload).await?;
    Ok(())
}

async fn send_to_printer(address: &str, payload: &[u8]) -> Result<(), String> {
    // 3 second timeout for connection
    let connect_future = TcpStream::connect(address);
    let stream_result = tokio::time::timeout(Duration::from_secs(3), connect_future).await;

    let mut stream = match stream_result {
        Ok(Ok(s)) => s,
        Ok(Err(e)) => return Err(format!("Failed to connect to printer at {}: {}", address, e)),
        Err(_) => return Err(format!("Connection to printer at {} timed out.", address)),
    };

    // 2 second timeout for write
    let write_future = stream.write_all(payload);
    match tokio::time::timeout(Duration::from_secs(2), write_future).await {
        Ok(Ok(_)) => Ok(()),
        Ok(Err(e)) => Err(format!("Failed to write to printer: {}", e)),
        Err(_) => Err("Write to printer timed out.".to_string()),
    }
}

fn generate_escpos_receipt(sale: &Sale, items: &Vec<SaleItem>, payments: &Vec<Payment>) -> Vec<u8> {
    let mut payload = Vec::new();
    payload.extend_from_slice(ESC_INIT);
    
    // Header
    payload.extend_from_slice(ESC_ALIGN_CENTER);
    payload.extend_from_slice(ESC_BOLD_ON);
    payload.extend_from_slice(b"IR POS STORE\n"); // Fallback, could load from DB
    payload.extend_from_slice(ESC_BOLD_OFF);
    payload.extend_from_slice(b"Colombo, Sri Lanka\n");
    payload.extend_from_slice(b"------------------------------------------\n");
    
    // Meta
    payload.extend_from_slice(ESC_ALIGN_LEFT);
    payload.extend_from_slice(format!("Invoice: {}\n", sale.invoice_number).as_bytes());
    payload.extend_from_slice(format!("Date: {}\n", sale.created_at).as_bytes());
    payload.extend_from_slice(b"------------------------------------------\n");

    // Items
    for item in items {
        payload.extend_from_slice(format!("{}\n", item.name_en).as_bytes());
        let line = format!("  {} x {:.2}          {:.2}\n", item.quantity, item.unit_price as f64 / 100.0, item.total as f64 / 100.0);
        payload.extend_from_slice(line.as_bytes());
    }
    payload.extend_from_slice(b"------------------------------------------\n");

    // Totals
    payload.extend_from_slice(ESC_ALIGN_CENTER);
    payload.extend_from_slice(format!("Total: LKR {:.2}\n", sale.grand_total as f64 / 100.0).as_bytes());
    if sale.discount_total > 0 {
        payload.extend_from_slice(format!("Discount: LKR {:.2}\n", sale.discount_total as f64 / 100.0).as_bytes());
    }

    if let Some(payment) = payments.first() {
        payload.extend_from_slice(format!("Paid ({}): LKR {:.2}\n", payment.payment_method, payment.amount_received as f64 / 100.0).as_bytes());
        payload.extend_from_slice(format!("Change: LKR {:.2}\n", payment.change_returned as f64 / 100.0).as_bytes());
    }

    payload.extend_from_slice(b"------------------------------------------\n");
    payload.extend_from_slice(b"Thank you for shopping with us!\n");
    payload.extend_from_slice(b"\n\n\n\n");
    payload.extend_from_slice(ESC_CUT);

    payload
}
