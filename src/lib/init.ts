import { getDb, initSchema } from "./db";

let seeded = false;

export function ensureSeeded() {
  initSchema();
  if (seeded) return;

  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number };
  if (count.c > 0) {
    ensureLegacyBatches();
    seeded = true;
    return;
  }

  const insertClient = db.prepare(`
    INSERT INTO clients (name, type, address, phone, contact_person)
    VALUES (@name, @type, @address, @phone, @contactPerson)
  `);

  const clients = [
    { name: "Demo Cafe", type: "кафе", address: "Demo street 1", phone: "555-0101", contactPerson: "Demo Contact 1" },
    { name: "Demo Market", type: "магазин", address: "Demo avenue 2", phone: "555-0102", contactPerson: "Demo Contact 2" },
    { name: "Demo Supermarket", type: "супермаркет", address: "Demo street 3", phone: "555-0103", contactPerson: "Demo Contact 3" },
    { name: "Demo Kiosk", type: "киоск", address: "Demo Park", phone: "555-0104", contactPerson: "Demo Contact 4" },
    { name: "Demo Restaurant", type: "ресторан", address: "Demo street 4", phone: "555-0105", contactPerson: "Demo Contact 5" },
  ];

  for (const c of clients) {
    insertClient.run(c);
  }

  const insertProduct = db.prepare(`
    INSERT INTO products (name, sku, category, price_per_box, units_per_box, min_stock)
    VALUES (@name, @sku, @category, @pricePerBox, @unitsPerBox, @minStock)
  `);

  const products = [
    { name: "Пломбир классический", sku: "PLM-001", category: "молочное", pricePerBox: 2400, unitsPerBox: 24, minStock: 10 },
    { name: "Эскимо шоколадное", sku: "ESK-002", category: "эскимо", pricePerBox: 1800, unitsPerBox: 20, minStock: 8 },
    { name: "Рожок ванильный", sku: "ROJ-003", category: "рожок", pricePerBox: 1500, unitsPerBox: 30, minStock: 12 },
    { name: "Фруктовый лёд", sku: "FRL-004", category: "фруктовое", pricePerBox: 1200, unitsPerBox: 40, minStock: 15 },
    { name: "Семейная упаковка", sku: "SEM-005", category: "семейное", pricePerBox: 3200, unitsPerBox: 6, minStock: 5 },
    { name: "Сорбет малина", sku: "SRB-006", category: "сорбет", pricePerBox: 2100, unitsPerBox: 18, minStock: 6 },
  ];

  for (const p of products) {
    insertProduct.run(p);
  }

  const insertStock = db.prepare(`
    INSERT INTO stock (product_id, quantity) VALUES (@productId, @quantity)
  `);

  const stock = [
    { productId: 1, quantity: 45 },
    { productId: 2, quantity: 7 },
    { productId: 3, quantity: 22 },
    { productId: 4, quantity: 3 },
    { productId: 5, quantity: 18 },
    { productId: 6, quantity: 4 },
  ];

  for (const s of stock) {
    insertStock.run(s);
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (client_id, status, delivery_date, total_amount, notes)
    VALUES (@clientId, @status, @deliveryDate, @totalAmount, @notes)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (@orderId, @productId, @quantity, @unitPrice)
  `);

  const today = new Date().toISOString().slice(0, 10);
  const order1 = insertOrder.run({
    clientId: 1,
    status: "новый",
    deliveryDate: today,
    totalAmount: 6600,
    notes: "Доставить до 14:00",
  });

  insertOrderItem.run({ orderId: order1.lastInsertRowid, productId: 1, quantity: 2, unitPrice: 2400 });
  insertOrderItem.run({ orderId: order1.lastInsertRowid, productId: 2, quantity: 1, unitPrice: 1800 });

  const order2 = insertOrder.run({
    clientId: 3,
    status: "в доставке",
    deliveryDate: today,
    totalAmount: 4500,
    notes: null,
  });

  insertOrderItem.run({ orderId: order2.lastInsertRowid, productId: 3, quantity: 3, unitPrice: 1500 });

  const insertRoute = db.prepare(`
    INSERT INTO routes (name, rep_name, route_date, status)
    VALUES (@name, @repName, @routeDate, @status)
  `);

  const route1 = insertRoute.run({
    name: "Маршрут Север",
    repName: "Алексей Торговый",
    routeDate: today,
    status: "в работе",
  });

  const insertStop = db.prepare(`
    INSERT INTO route_stops (route_id, client_id, sequence, status)
    VALUES (@routeId, @clientId, @sequence, @status)
  `);

  insertStop.run({ routeId: route1.lastInsertRowid, clientId: 1, sequence: 1, status: "выполнен" });
  insertStop.run({ routeId: route1.lastInsertRowid, clientId: 2, sequence: 2, status: "в работе" });
  insertStop.run({ routeId: route1.lastInsertRowid, clientId: 4, sequence: 3, status: "ожидает" });

  ensureLegacyBatches();
  seeded = true;
}

function ensureLegacyBatches() {
  const db = getDb();
  const batches = (db.prepare("SELECT COUNT(*) as c FROM inventory_batches").get() as { c: number }).c;
  if (batches) return;
  const rows = db.prepare("SELECT product_id, quantity FROM stock WHERE quantity > 0").all() as Array<{ product_id: number; quantity: number }>;
  const today = new Date().toISOString().slice(0, 10);
  const expiry = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const insert = db.prepare("INSERT INTO inventory_batches(product_id, lot_code, expiry_date, received_date, quantity_received, quantity_available, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const row of rows) insert.run(row.product_id, `INITIAL-${row.product_id}`, expiry, today, row.quantity, row.quantity, "Стартовый остаток до внедрения партий");
}
