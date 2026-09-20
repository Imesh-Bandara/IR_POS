-- App Metadata and Settings
CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    section TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (section, key)
);

-- Organization Structure
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_number TEXT,
    receipt_footer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id),
    name TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS terminals (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL REFERENCES branches(id),
    name TEXT NOT NULL,
    device_id TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auth & Roles
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT REFERENCES roles(id),
    permission_id TEXT REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id TEXT NOT NULL REFERENCES roles(id),
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Catalog
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_si TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_si TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_si TEXT,
    abbreviation TEXT
);

-- Note: All monetary values are stored in minor units (e.g. cents) as INTEGER to avoid floating point issues.
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    name_en TEXT NOT NULL,
    name_si TEXT,
    category_id TEXT REFERENCES categories(id),
    brand_id TEXT REFERENCES brands(id),
    unit_id TEXT REFERENCES units(id),
    cost_price INTEGER NOT NULL, 
    selling_price INTEGER NOT NULL,
    wholesale_price INTEGER,
    tax_rate INTEGER DEFAULT 0, -- Stored as percentage * 100 or minor units
    discount_amount INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    supplier_id TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Inventory
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity_changed INTEGER NOT NULL,
    movement_type TEXT NOT NULL, -- e.g., 'SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT'
    reference_id TEXT, -- e.g., invoice_id or purchase_id
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Entities
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_si TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    credit_limit INTEGER DEFAULT 0,
    outstanding_balance INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions & Sales
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    terminal_id TEXT REFERENCES terminals(id),
    cashier_id TEXT NOT NULL REFERENCES users(id),
    customer_id TEXT REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, HELD, VOIDED, REFUNDED
    subtotal INTEGER NOT NULL,
    discount_total INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    grand_total INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);

CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    tax_amount INTEGER DEFAULT 0,
    subtotal INTEGER NOT NULL,
    total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id),
    payment_method TEXT NOT NULL, -- CASH, CARD, OTHER
    amount_expected INTEGER NOT NULL,
    amount_received INTEGER NOT NULL,
    change_returned INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Returns
CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    original_sale_id TEXT NOT NULL REFERENCES sales(id),
    return_invoice_number TEXT UNIQUE NOT NULL,
    cashier_id TEXT NOT NULL REFERENCES users(id),
    reason TEXT,
    refund_method TEXT NOT NULL,
    total_refund INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_items (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL REFERENCES returns(id),
    sale_item_id TEXT NOT NULL REFERENCES sale_items(id),
    quantity INTEGER NOT NULL,
    refund_amount INTEGER NOT NULL
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    purchase_order_number TEXT,
    invoice_number TEXT,
    status TEXT NOT NULL DEFAULT 'RECEIVED',
    total_amount INTEGER NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'UNPAID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES purchases(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL,
    total_cost INTEGER NOT NULL
);

-- Cash Management
CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY,
    terminal_id TEXT NOT NULL REFERENCES terminals(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    opening_balance INTEGER NOT NULL,
    closing_balance INTEGER,
    expected_balance INTEGER,
    difference INTEGER,
    status TEXT NOT NULL DEFAULT 'OPEN',
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME
);

CREATE TABLE IF NOT EXISTS cash_transactions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES cash_sessions(id),
    transaction_type TEXT NOT NULL, -- SALE, REFUND, EXPENSE, IN, OUT
    amount INTEGER NOT NULL,
    reference_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    notes TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values TEXT, -- JSON string
    new_values TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
