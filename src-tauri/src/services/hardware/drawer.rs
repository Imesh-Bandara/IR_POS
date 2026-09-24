use sqlx::SqlitePool;
use tokio::net::TcpStream;
use tokio::io::AsyncWriteExt;
use std::time::Duration;
use sqlx::Row;

const ESC_DRAWER_KICK: &[u8] = b"\x1B\x70\x00\x19\xFA"; // Standard ESC/POS pulse (pin 2, 25ms on, 250ms off)

pub async fn open_cash_drawer(db: &SqlitePool) -> Result<(), String> {
    // 1. Check settings to see if drawer is enabled
    let enabled_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'cash_drawer_enabled'")
        .fetch_optional(db).await.map_err(|e| e.to_string())?;
        
    let is_enabled = match enabled_row {
        Some(row) => {
            let val: String = row.get("value");
            val == "true"
        },
        None => false
    };

    if !is_enabled {
        return Err("Cash drawer is disabled in settings.".into());
    }

    // Cash drawers typically connect through the receipt printer
    let conn_type_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_connection'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let conn_type: String = conn_type_row.get("value");

    if conn_type != "LAN" {
        return Err(format!("Connection type {} is not natively supported for cash drawer.", conn_type));
    }

    let ip_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_ip'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let ip: String = ip_row.get("value");

    let port_row = sqlx::query("SELECT value FROM settings WHERE section = 'hardware' AND key = 'receipt_printer_port'")
        .fetch_one(db).await.map_err(|e| e.to_string())?;
    let port: String = port_row.get("value");

    let address = format!("{}:{}", ip, port);

    // Send the kick payload
    send_to_printer(&address, ESC_DRAWER_KICK).await?;

    Ok(())
}

async fn send_to_printer(address: &str, payload: &[u8]) -> Result<(), String> {
    let connect_future = TcpStream::connect(address);
    let stream_result = tokio::time::timeout(Duration::from_secs(3), connect_future).await;

    let mut stream = match stream_result {
        Ok(Ok(s)) => s,
        Ok(Err(e)) => return Err(format!("Failed to connect to printer at {}: {}", address, e)),
        Err(_) => return Err(format!("Connection to printer at {} timed out.", address)),
    };

    let write_future = stream.write_all(payload);
    match tokio::time::timeout(Duration::from_secs(2), write_future).await {
        Ok(Ok(_)) => Ok(()),
        Ok(Err(e)) => Err(format!("Failed to write to printer: {}", e)),
        Err(_) => Err("Write to printer timed out.".to_string()),
    }
}
