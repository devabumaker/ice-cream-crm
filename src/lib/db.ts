import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "crm.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initSchema() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'магазин',
      address TEXT,
      phone TEXT,
      contact_person TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'молочное',
      price_per_box REAL NOT NULL,
      units_per_box INTEGER NOT NULL DEFAULT 12,
      min_stock INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock (
      product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT 'ручная корректировка',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      status TEXT NOT NULL DEFAULT 'новый',
      delivery_date TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rep_name TEXT NOT NULL,
      route_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'запланирован',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS route_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      sequence INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ожидает',
      visited_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      contact_person TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      supplier_id INTEGER REFERENCES suppliers(id),
      lot_code TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      received_date TEXT NOT NULL,
      quantity_received INTEGER NOT NULL,
      quantity_available INTEGER NOT NULL,
      unit_cost REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_id, lot_code)
    );
    CREATE INDEX IF NOT EXISTS idx_batches_fefo ON inventory_batches(product_id, expiry_date, quantity_available);
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_batch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
      batch_id INTEGER NOT NULL REFERENCES inventory_batches(id),
      quantity INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_order_batch_items_order ON order_batch_items(order_id);
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      order_id INTEGER REFERENCES orders(id),
      amount REAL NOT NULL CHECK(amount > 0),
      method TEXT NOT NULL DEFAULT 'наличные',
      paid_at TEXT NOT NULL DEFAULT (datetime('now')),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id, paid_at DESC);
    CREATE TABLE IF NOT EXISTS drivers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, phone TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT NOT NULL UNIQUE, description TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      driver_id INTEGER REFERENCES drivers(id), vehicle_id INTEGER REFERENCES vehicles(id), route_id INTEGER REFERENCES routes(id),
      status TEXT NOT NULL DEFAULT 'назначена', recipient_name TEXT, proof_note TEXT, delivered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status, created_at DESC);
    CREATE TABLE IF NOT EXISTS inventory_counts (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id), batch_id INTEGER REFERENCES inventory_batches(id), expected_quantity INTEGER NOT NULL, actual_quantity INTEGER NOT NULL, reason TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL REFERENCES suppliers(id), amount REAL NOT NULL CHECK(amount > 0), paid_at TEXT NOT NULL DEFAULT (datetime('now')), note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS damaged_goods (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id), batch_id INTEGER REFERENCES inventory_batches(id), quantity INTEGER NOT NULL CHECK(quantity > 0), reason TEXT, photo_data TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  // Forward-compatible migrations for installations created before these features.
  const columns = (table: string) => database.prepare(`PRAGMA table_info(${table})`).all().map((c: any) => c.name);
  const add = (table: string, definition: string) => { const name = definition.trim().split(/\s+/)[0]; if (!columns(table).includes(name)) database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`); };
  add("clients", "payment_due_date TEXT");
  add("users", "client_id INTEGER REFERENCES clients(id)");
  add("inventory_batches", "photo_data TEXT");
}

