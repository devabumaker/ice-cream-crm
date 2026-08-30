import { getDb } from "./db";
import { createUser } from "./auth";
import type {
  Client,
  DashboardStats,
  Order,
  OrderItem,
  Product,
  Route,
  RouteStop,
  StockItem,
} from "./types";

const ORDER_STATUSES = new Set(["новый", "в доставке", "доставлен", "отменён"]);

function positiveInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${field} должно быть положительным целым числом`);
  return n;
}

function nonNegativeInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${field} должно быть целым неотрицательным числом`);
  return n;
}

function nonNegativeNumber(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} должно быть неотрицательным числом`);
  return n;
}

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as number,
    name: row.name as string,
    type: row.type as string,
    address: (row.address as string) ?? null,
    phone: (row.phone as string) ?? null,
    contactPerson: (row.contact_person as string) ?? null,
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as number,
    name: row.name as string,
    sku: row.sku as string,
    category: row.category as string,
    pricePerBox: row.price_per_box as number,
    unitsPerBox: row.units_per_box as number,
    minStock: row.min_stock as number,
    createdAt: row.created_at as string,
  };
}

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as number,
    clientId: row.client_id as number,
    status: row.status as string,
    deliveryDate: (row.delivery_date as string) ?? null,
    totalAmount: row.total_amount as number,
    paidAmount: Number(row.paid_amount ?? 0),
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
    client: row.client_name
      ? {
          id: row.client_id as number,
          name: row.client_name as string,
          type: (row.client_type as string) ?? "",
          address: null,
          phone: null,
          contactPerson: null,
          notes: null,
          createdAt: "",
        }
      : undefined,
  };
}

export function getAllClients(): Client[] {
  const rows = getDb().prepare("SELECT * FROM clients ORDER BY name").all();
  return rows.map((r) => mapClient(r as Record<string, unknown>));
}

export function createClient(data: {
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  contactPerson?: string;
  notes?: string;
  paymentDueDate?: string;
  username?: string;
  password?: string;
}): Client {
  if (!data.name?.trim()) throw new Error("Укажите название клиента");
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO clients (name, type, address, phone, contact_person, notes)
       VALUES (@name, @type, @address, @phone, @contactPerson, @notes)`
    )
    .run({
      name: data.name,
      type: data.type ?? "магазин",
      address: data.address ?? null,
      phone: data.phone ?? null,
      contactPerson: data.contactPerson ?? null,
      notes: data.notes ?? null,
    });

  const clientId = Number(result.lastInsertRowid);
  if (data.paymentDueDate) db.prepare("UPDATE clients SET payment_due_date = ? WHERE id = ?").run(data.paymentDueDate, clientId);
  if (data.username || data.password) {
    if (!data.username || !data.password) throw new Error("Для аккаунта клиента укажите логин и пароль");
    createUser(data.username, data.password, "client", clientId);
  }
  const row = getDb()
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(clientId) as Record<string, unknown>;
  return mapClient(row);
}

export function getAllProducts(): Array<Product & { stock: number }> {
  const rows = getDb()
    .prepare(
      `SELECT p.*, COALESCE(s.quantity, 0) as stock
       FROM products p
       LEFT JOIN stock s ON s.product_id = p.id
       ORDER BY p.name`
    )
    .all();

  return rows.map((r) => ({
    ...mapProduct(r as Record<string, unknown>),
    stock: (r as Record<string, unknown>).stock as number,
  }));
}

export function createProduct(data: {
  name: string;
  sku: string;
  category?: string;
  pricePerBox: number;
  unitsPerBox?: number;
  minStock?: number;
  initialStock?: number;
}): Product {
  if (!data.name?.trim() || !data.sku?.trim()) throw new Error("Укажите название и SKU товара");
  const pricePerBox = nonNegativeNumber(data.pricePerBox, "Цена");
  const unitsPerBox = positiveInt(data.unitsPerBox ?? 12, "Количество штук в коробке");
  const minStock = nonNegativeNumber(data.minStock ?? 5, "Минимальный остаток");
  const initialStock = nonNegativeNumber(data.initialStock ?? 0, "Начальный остаток");
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO products (name, sku, category, price_per_box, units_per_box, min_stock)
       VALUES (@name, @sku, @category, @pricePerBox, @unitsPerBox, @minStock)`
    )
    .run({
      name: data.name,
      sku: data.sku,
      category: data.category ?? "молочное",
      pricePerBox,
      unitsPerBox,
      minStock,
    });

  const productId = Number(result.lastInsertRowid);
  db.prepare("INSERT INTO stock (product_id, quantity) VALUES (?, ?)").run(
    productId,
    initialStock
  );

  return mapProduct(
    db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as Record<string, unknown>
  );
}

export function getAllStock(): StockItem[] {
  const rows = getDb()
    .prepare(
      `SELECT s.*, p.name, p.sku, p.category, p.price_per_box, p.units_per_box, p.min_stock, p.created_at
       FROM stock s
       JOIN products p ON p.id = s.product_id
       ORDER BY s.quantity ASC`
    )
    .all();

  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      productId: row.product_id as number,
      quantity: row.quantity as number,
      updatedAt: row.updated_at as string,
      product: mapProduct({ ...row, id: row.product_id }),
    };
  });
}

export function updateStock(productId: number, quantity: number): StockItem {
  quantity = nonNegativeInt(quantity, "Остаток");
  const db = getDb();
  const previous = db.prepare("SELECT quantity FROM stock WHERE product_id = ?").get(productId) as { quantity: number } | undefined;
  db.prepare(
    `INSERT INTO stock (product_id, quantity, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(product_id) DO UPDATE SET quantity = excluded.quantity, updated_at = datetime('now')`
  ).run(productId, quantity);
  db.prepare("INSERT INTO stock_movements (product_id, delta, quantity_after, reason) VALUES (?, ?, ?, ?)")
    .run(productId, quantity - (previous?.quantity ?? 0), quantity, "ручная корректировка");

  const row = db
    .prepare(
      `SELECT s.*, p.*
       FROM stock s JOIN products p ON p.id = s.product_id
       WHERE s.product_id = ?`
    )
    .get(productId) as Record<string, unknown>;

  return {
    productId: row.product_id as number,
    quantity: row.quantity as number,
    updatedAt: row.updated_at as string,
    product: mapProduct({ ...row, id: row.product_id }),
  };
}

export function adjustStock(productId: number, delta: number): StockItem {
  if (!Number.isInteger(Number(delta)) || Number(delta) === 0) throw new Error("Изменение остатка должно быть целым числом");
  const current = getDb()
    .prepare("SELECT quantity FROM stock WHERE product_id = ?")
    .get(productId) as { quantity: number } | undefined;

  const newQty = Math.max(0, (current?.quantity ?? 0) + delta);
  return updateStock(productId, newQty);
}

export function getStockMovements(limit = 100) {
  return getDb().prepare(`
    SELECT sm.*, p.name as product_name, p.sku
    FROM stock_movements sm JOIN products p ON p.id = sm.product_id
    ORDER BY sm.created_at DESC, sm.id DESC LIMIT ?
  `).all(limit);
}

function getOrderItems(orderId: number): OrderItem[] {
  const rows = getDb()
    .prepare(
      `SELECT oi.*, p.name, p.sku, p.category, p.price_per_box, p.units_per_box, p.min_stock, p.created_at
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(orderId);

  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as number,
      orderId: row.order_id as number,
      productId: row.product_id as number,
      quantity: row.quantity as number,
      unitPrice: row.unit_price as number,
      product: mapProduct({ ...row, id: row.product_id }),
    };
  });
}

export function getAllOrders(): Order[] {
  const rows = getDb()
    .prepare(
      `SELECT o.*, c.name as client_name, c.type as client_type
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       ORDER BY o.created_at DESC`
    )
    .all();

  return rows.map((r) => {
    const order = mapOrder(r as Record<string, unknown>);
    order.items = getOrderItems(order.id);
    return order;
  });
}

export function getOrderById(id: number): Order | null {
  const row = getDb()
    .prepare(
      `SELECT o.*, c.name as client_name, c.type as client_type
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       WHERE o.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!row) return null;
  const order = mapOrder(row);
  order.items = getOrderItems(order.id);
  return order;
}

export function createOrder(data: {
  clientId: number;
  deliveryDate?: string;
  notes?: string;
  items: Array<{ productId: number; quantity: number }>;
}): Order {
  if (!data.items?.length) throw new Error("Заказ должен содержать хотя бы одну позицию");
  const db = getDb();
  const tx = db.transaction(() => {
    if (!db.prepare("SELECT id FROM clients WHERE id = ?").get(data.clientId)) throw new Error("Клиент не найден");
    let totalAmount = 0;
    const normalized = data.items.map((item) => ({ ...item, quantity: positiveInt(item.quantity, "Количество товара") }));
    for (const item of normalized) {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.productId) as Record<string, unknown> | undefined;
      if (!product) throw new Error(`Продукт ${item.productId} не найден`);
      const available = db.prepare("SELECT COALESCE(SUM(quantity_available), 0) q FROM inventory_batches WHERE product_id = ? AND quantity_available > 0 AND expiry_date >= date('now')").get(item.productId) as {q:number};
      if (available.q < item.quantity) throw new Error(`Недостаточно годного товара «${product.name}» по партиям`);
      totalAmount += Number(product.price_per_box) * item.quantity;
    }
    const orderId = Number(db.prepare(`INSERT INTO orders (client_id,status,delivery_date,total_amount,notes) VALUES (?, 'новый', ?, ?, ?)`).run(data.clientId,data.deliveryDate ?? null,totalAmount,data.notes ?? null).lastInsertRowid);
    const insertItem=db.prepare("INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES(?,?,?,?)");
    const alloc=db.prepare("INSERT INTO order_batch_items(order_id,order_item_id,batch_id,quantity) VALUES(?,?,?,?)");
    for(const item of normalized) {
      const price=(db.prepare("SELECT price_per_box FROM products WHERE id=?").get(item.productId) as {price_per_box:number}).price_per_box;
      const itemId=Number(insertItem.run(orderId,item.productId,item.quantity,price).lastInsertRowid);
      let left=item.quantity;
      const batches=db.prepare("SELECT id,quantity_available FROM inventory_batches WHERE product_id=? AND quantity_available>0 AND expiry_date>=date('now') ORDER BY expiry_date ASC,id ASC").all(item.productId) as Array<{id:number;quantity_available:number}>;
      for(const batch of batches){if(!left)break;const take=Math.min(left,batch.quantity_available);db.prepare("UPDATE inventory_batches SET quantity_available=quantity_available-? WHERE id=?").run(take,batch.id);alloc.run(orderId,itemId,batch.id,take);left-=take;}
      db.prepare("UPDATE stock SET quantity=quantity-?,updated_at=datetime('now') WHERE product_id=?").run(item.quantity,item.productId);
      const after=(db.prepare("SELECT quantity FROM stock WHERE product_id=?").get(item.productId) as {quantity:number}).quantity;
      db.prepare("INSERT INTO stock_movements(product_id,delta,quantity_after,reason) VALUES(?,?,?,?)").run(item.productId,-item.quantity,after,`резерв заказа #${orderId} (FEFO)`);
    }
    db.prepare("INSERT INTO audit_log(action,entity_type,entity_id,details) VALUES(?,?,?,?)").run("create","order",String(orderId),JSON.stringify({clientId:data.clientId,totalAmount}));
    return orderId;
  });
  return getOrderById(tx())!;
}

export function updateOrderStatus(id: number, status: string): Order | null {
  if (!ORDER_STATUSES.has(status)) throw new Error("Недопустимый статус заказа");
  const db=getDb();
  db.transaction(() => {
    const order=db.prepare("SELECT status FROM orders WHERE id=?").get(id) as {status:string}|undefined;
    if(!order) return;
    if(order.status !== "отменён" && status === "отменён") {
      const allocations=db.prepare(`SELECT obi.batch_id,obi.quantity,oi.product_id FROM order_batch_items obi JOIN order_items oi ON oi.id=obi.order_item_id WHERE obi.order_id=?`).all(id) as Array<{batch_id:number;quantity:number;product_id:number}>;
      for(const a of allocations){db.prepare("UPDATE inventory_batches SET quantity_available=quantity_available+? WHERE id=?").run(a.quantity,a.batch_id);db.prepare("UPDATE stock SET quantity=quantity+?,updated_at=datetime('now') WHERE product_id=?").run(a.quantity,a.product_id);const after=(db.prepare("SELECT quantity FROM stock WHERE product_id=?").get(a.product_id) as {quantity:number}).quantity;db.prepare("INSERT INTO stock_movements(product_id,delta,quantity_after,reason) VALUES(?,?,?,?)").run(a.product_id,a.quantity,after,`возврат отменённого заказа #${id}`);}
    }
    db.prepare("UPDATE orders SET status=? WHERE id=?").run(status,id);
    db.prepare("INSERT INTO audit_log(action,entity_type,entity_id,details) VALUES(?,?,?,?)").run("status","order",String(id),JSON.stringify({from:order.status,to:status}));
  })();
  return getOrderById(id);
}

export function getAllRoutes(): Route[] {
  const routes = getDb()
    .prepare("SELECT * FROM routes ORDER BY route_date DESC, id DESC")
    .all() as Array<Record<string, unknown>>;

  return routes.map((r) => {
    const stops = getDb()
      .prepare(
        `SELECT rs.*, c.name as client_name, c.type as client_type, c.address
         FROM route_stops rs
         JOIN clients c ON c.id = rs.client_id
         WHERE rs.route_id = ?
         ORDER BY rs.sequence`
      )
      .all(r.id) as Array<Record<string, unknown>>;

    return {
      id: r.id as number,
      name: r.name as string,
      repName: r.rep_name as string,
      routeDate: r.route_date as string,
      status: r.status as string,
      createdAt: r.created_at as string,
      stops: stops.map((s) => ({
        id: s.id as number,
        routeId: s.route_id as number,
        clientId: s.client_id as number,
        sequence: s.sequence as number,
        status: s.status as string,
        visitedAt: (s.visited_at as string) ?? null,
        notes: (s.notes as string) ?? null,
        client: {
          id: s.client_id as number,
          name: s.client_name as string,
          type: (s.client_type as string) ?? "",
          address: (s.address as string) ?? null,
          phone: null,
          contactPerson: null,
          notes: null,
          createdAt: "",
        },
      })),
    };
  });
}

export function createRoute(data: {
  name: string;
  repName: string;
  routeDate: string;
  clientIds: number[];
}): Route {
  if (!data.name?.trim() || !data.repName?.trim() || !data.routeDate) throw new Error("Заполните данные маршрута");
  if (!Array.isArray(data.clientIds) || data.clientIds.length === 0) throw new Error("Добавьте точки маршрута");
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO routes (name, rep_name, route_date, status)
       VALUES (@name, @repName, @routeDate, 'запланирован')`
    )
    .run(data);

  const routeId = Number(result.lastInsertRowid);
  const insertStop = db.prepare(
    `INSERT INTO route_stops (route_id, client_id, sequence, status)
     VALUES (?, ?, ?, 'ожидает')`
  );

  data.clientIds.forEach((clientId, i) => {
    insertStop.run(routeId, clientId, i + 1);
  });

  return getAllRoutes().find((r) => r.id === routeId)!;
}

export function updateRouteStop(
  stopId: number,
  data: { status?: string; notes?: string }
): RouteStop | null {
  const db = getDb();
  const visitedAt = data.status === "выполнен" ? new Date().toISOString() : null;

  db.prepare(
    `UPDATE route_stops SET
       status = COALESCE(@status, status),
       notes = COALESCE(@notes, notes),
       visited_at = CASE WHEN @status = 'выполнен' THEN datetime('now') ELSE visited_at END
     WHERE id = @stopId`
  ).run({ ...data, stopId });

  const row = db
    .prepare(
      `SELECT rs.*, c.name as client_name
       FROM route_stops rs
       JOIN clients c ON c.id = rs.client_id
       WHERE rs.id = ?`
    )
    .get(stopId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as number,
    routeId: row.route_id as number,
    clientId: row.client_id as number,
    sequence: row.sequence as number,
    status: row.status as string,
    visitedAt: (row.visited_at as string) ?? null,
    notes: (row.notes as string) ?? null,
    client: {
      id: row.client_id as number,
      name: row.client_name as string,
      type: "",
      address: null,
      phone: null,
      contactPerson: null,
      notes: null,
      createdAt: "",
    },
  };
}

export function getDashboardStats(): DashboardStats {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  const totalClients = (db.prepare("SELECT COUNT(*) as c FROM clients").get() as { c: number }).c;
  const totalProducts = (db.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number }).c;
  const ordersToday = (
    db.prepare("SELECT COUNT(*) as c FROM orders WHERE delivery_date = ?").get(today) as { c: number }
  ).c;
  const revenueMonth = (
    db
      .prepare("SELECT COALESCE(SUM(total_amount), 0) as s FROM orders WHERE created_at >= ?")
      .get(monthStart) as { s: number }
  ).s;
  const lowStockCount = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM stock s
         JOIN products p ON p.id = s.product_id
         WHERE s.quantity <= p.min_stock`
      )
      .get() as { c: number }
  ).c;
  const activeRoutes = (
    db.prepare("SELECT COUNT(*) as c FROM routes WHERE status IN ('запланирован', 'в работе')").get() as {
      c: number;
    }
  ).c;

  const lowStockRows = db
    .prepare(
      `SELECT p.*, s.quantity
       FROM stock s
       JOIN products p ON p.id = s.product_id
       WHERE s.quantity <= p.min_stock
       ORDER BY s.quantity ASC
       LIMIT 5`
    )
    .all() as Array<Record<string, unknown>>;

  const recentOrders = getAllOrders().slice(0, 5);

  return {
    totalClients,
    totalProducts,
    ordersToday,
    revenueMonth,
    lowStockCount,
    activeRoutes,
    recentOrders,
    lowStock: lowStockRows.map((r) => ({
      ...mapProduct(r),
      quantity: r.quantity as number,
    })),
  };
}

export type InventoryBatch = {
  id: number; productId: number; productName: string; sku: string; supplierName: string | null;
  lotCode: string; expiryDate: string; receivedDate: string; quantityReceived: number; quantityAvailable: number; unitCost: number | null; notes: string | null;
};
export function getInventoryBatches(): InventoryBatch[] {
  return getDb().prepare(`SELECT b.*, p.name product_name, p.sku, s.name supplier_name FROM inventory_batches b JOIN products p ON p.id=b.product_id LEFT JOIN suppliers s ON s.id=b.supplier_id ORDER BY b.expiry_date ASC, b.id DESC`).all().map((r) => { const x=r as Record<string,unknown>; return {id:x.id as number,productId:x.product_id as number,productName:x.product_name as string,sku:x.sku as string,supplierName:x.supplier_name as string|null,lotCode:x.lot_code as string,expiryDate:x.expiry_date as string,receivedDate:x.received_date as string,quantityReceived:x.quantity_received as number,quantityAvailable:x.quantity_available as number,unitCost:x.unit_cost as number|null,notes:x.notes as string|null}; });
}
export function receiveBatch(data: {productId:number; supplierName?:string; lotCode:string; expiryDate:string; receivedDate?:string; quantity:number; unitCost?:number; notes?:string; photoData?:string}) {
  if (!data.lotCode?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(data.expiryDate)) throw new Error("Укажите номер партии и срок годности");
  const quantity=positiveInt(data.quantity,"Количество"); const db=getDb();
  return db.transaction(() => {
    if(!db.prepare("SELECT id FROM products WHERE id=?").get(data.productId)) throw new Error("Товар не найден");
    let supplierId:number|null=null;
    if(data.supplierName?.trim()) { const existing=db.prepare("SELECT id FROM suppliers WHERE name=?").get(data.supplierName.trim()) as {id:number}|undefined; supplierId=existing?.id??Number(db.prepare("INSERT INTO suppliers(name) VALUES(?)").run(data.supplierName.trim()).lastInsertRowid); }
    const result=db.prepare(`INSERT INTO inventory_batches(product_id,supplier_id,lot_code,expiry_date,received_date,quantity_received,quantity_available,unit_cost,notes,photo_data) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(data.productId,supplierId,data.lotCode.trim(),data.expiryDate,data.receivedDate??new Date().toISOString().slice(0,10),quantity,quantity, data.unitCost==null?null:nonNegativeNumber(data.unitCost,"Себестоимость"),data.notes??null,data.photoData??null);
    db.prepare(`INSERT INTO stock(product_id,quantity,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(product_id) DO UPDATE SET quantity=quantity+excluded.quantity,updated_at=datetime('now')`).run(data.productId,quantity);
    db.prepare("INSERT INTO stock_movements(product_id,delta,quantity_after,reason) SELECT ?,?,quantity,? FROM stock WHERE product_id=?").run(data.productId,quantity,"приёмка: "+data.lotCode.trim(),data.productId);
    db.prepare("INSERT INTO audit_log(action,entity_type,entity_id,details) VALUES(?,?,?,?)").run("receive","batch",String(result.lastInsertRowid),JSON.stringify({productId:data.productId,lotCode:data.lotCode,quantity}));
    return {id:Number(result.lastInsertRowid)};
  })();
}


export type Payment = { id:number; clientId:number; clientName:string; orderId:number|null; amount:number; method:string; paidAt:string; note:string|null };
export function getPayments(): Payment[] {
 const rows=getDb().prepare(`SELECT pay.*,c.name client_name FROM payments pay JOIN clients c ON c.id=pay.client_id ORDER BY pay.paid_at DESC,pay.id DESC`).all() as Array<Record<string,unknown>>;
 return rows.map(r=>({id:r.id as number,clientId:r.client_id as number,clientName:r.client_name as string,orderId:r.order_id as number|null,amount:r.amount as number,method:r.method as string,paidAt:r.paid_at as string,note:r.note as string|null}));
}
export function createPayment(data:{clientId:number;orderId?:number;amount:number;method?:string;paidAt?:string;note?:string}) {
 const amount=nonNegativeNumber(data.amount,"Сумма"); if(amount<=0) throw new Error("Сумма должна быть больше нуля"); const db=getDb();
 if(!db.prepare("SELECT id FROM clients WHERE id=?").get(data.clientId)) throw new Error("Клиент не найден");
 if(data.orderId && !db.prepare("SELECT id FROM orders WHERE id=? AND client_id=?").get(data.orderId,data.clientId)) throw new Error("Заказ не принадлежит выбранному клиенту");
 if(data.orderId){const order=db.prepare("SELECT total_amount FROM orders WHERE id=?").get(data.orderId) as {total_amount:number}; const paid=(db.prepare("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE order_id=?").get(data.orderId) as {s:number}).s; if(paid+amount>order.total_amount+0.001) throw new Error("Сумма превышает остаток по заказу");}
 const id=Number(db.prepare("INSERT INTO payments(client_id,order_id,amount,method,paid_at,note) VALUES(?,?,?,?,?,?)").run(data.clientId,data.orderId??null,amount,data.method??"наличные",data.paidAt??new Date().toISOString(),data.note??null).lastInsertRowid);
 db.prepare("INSERT INTO audit_log(action,entity_type,entity_id,details) VALUES(?,?,?,?)").run("create","payment",String(id),JSON.stringify({clientId:data.clientId,orderId:data.orderId,amount})); return id;
}
export function getReceivables() {
 return getDb().prepare(`SELECT c.id,c.name,COALESCE((SELECT SUM(o.total_amount) FROM orders o WHERE o.client_id=c.id AND o.status <> 'отменён'),0) sales,COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.client_id=c.id),0) paid FROM clients c ORDER BY (sales-paid) DESC,c.name`).all().map((r)=>{const x=r as {id:number;name:string;sales:number;paid:number};return {...x,debt:Math.max(0,x.sales-x.paid)}});
}


const DELIVERY_STATUSES=new Set(["назначена","в пути","доставлена","не доставлена","возврат"]);
export function getDeliveries(){return getDb().prepare(`SELECT d.*,o.total_amount,o.status order_status,c.name client_name,dr.name driver_name,v.plate vehicle_plate,r.name route_name FROM deliveries d JOIN orders o ON o.id=d.order_id JOIN clients c ON c.id=o.client_id LEFT JOIN drivers dr ON dr.id=d.driver_id LEFT JOIN vehicles v ON v.id=d.vehicle_id LEFT JOIN routes r ON r.id=d.route_id ORDER BY d.created_at DESC`).all();}
export function createDelivery(data:{orderId:number;driverName?:string;vehiclePlate?:string;routeId?:number}){const db=getDb();if(!db.prepare("SELECT id FROM orders WHERE id=? AND status <> 'отменён'").get(data.orderId))throw new Error("Заказ не найден или отменён");let driverId=null,vehicleId=null;if(data.driverName?.trim()){const x=db.prepare("SELECT id FROM drivers WHERE name=?").get(data.driverName.trim()) as {id:number}|undefined;driverId=x?.id??Number(db.prepare("INSERT INTO drivers(name) VALUES(?)").run(data.driverName.trim()).lastInsertRowid)}if(data.vehiclePlate?.trim()){const x=db.prepare("SELECT id FROM vehicles WHERE plate=?").get(data.vehiclePlate.trim()) as {id:number}|undefined;vehicleId=x?.id??Number(db.prepare("INSERT INTO vehicles(plate) VALUES(?)").run(data.vehiclePlate.trim()).lastInsertRowid)}const id=Number(db.prepare("INSERT INTO deliveries(order_id,driver_id,vehicle_id,route_id) VALUES(?,?,?,?)").run(data.orderId,driverId,vehicleId,data.routeId??null).lastInsertRowid);db.prepare("UPDATE orders SET status='в доставке' WHERE id=?").run(data.orderId);db.prepare("INSERT INTO audit_log(action,entity_type,entity_id,details) VALUES(?,?,?,?)").run("create","delivery",String(id),JSON.stringify(data));return id;}
export function updateDelivery(id:number,data:{status:string;recipientName?:string;proofNote?:string}){if(!DELIVERY_STATUSES.has(data.status))throw new Error("Недопустимый статус доставки");const db=getDb();const d=db.prepare("SELECT order_id FROM deliveries WHERE id=?").get(id) as {order_id:number}|undefined;if(!d)return null;db.prepare("UPDATE deliveries SET status=?,recipient_name=COALESCE(?,recipient_name),proof_note=COALESCE(?,proof_note),delivered_at=CASE WHEN ?='доставлена' THEN datetime('now') ELSE delivered_at END,updated_at=datetime('now') WHERE id=?").run(data.status,data.recipientName??null,data.proofNote??null,data.status,id);if(data.status==='доставлена')db.prepare("UPDATE orders SET status='доставлен' WHERE id=?").run(d.order_id);if(data.status==='возврат'||data.status==='не доставлена')db.prepare("UPDATE orders SET status='новый' WHERE id=?").run(d.order_id);return {id,status:data.status};}

export function getAudit(){return getDb().prepare("SELECT * FROM audit_log ORDER BY created_at DESC,id DESC LIMIT 200").all();}

export function recordInventoryCount(data:{productId:number;batchId?:number;actualQuantity:number;reason?:string}){const db=getDb();const b=data.batchId?db.prepare("SELECT quantity_available FROM inventory_batches WHERE id=?").get(data.batchId) as {quantity_available:number}:undefined;const expected=b?.quantity_available??(db.prepare("SELECT quantity FROM stock WHERE product_id=?").get(data.productId) as {quantity:number}).quantity;const actual=nonNegativeInt(data.actualQuantity,"Фактический остаток");db.prepare("INSERT INTO inventory_counts(product_id,batch_id,expected_quantity,actual_quantity,reason) VALUES(?,?,?,?,?)").run(data.productId,data.batchId??null,expected,actual,data.reason??null);if(data.batchId)db.prepare("UPDATE inventory_batches SET quantity_available=? WHERE id=?").run(actual,data.batchId);db.prepare("UPDATE stock SET quantity=quantity+?,updated_at=datetime('now') WHERE product_id=?").run(actual-expected,data.productId);return {expected,actual,difference:actual-expected};}
export function getInventoryCounts(){return getDb().prepare("SELECT ic.*,p.name product_name,b.lot_code FROM inventory_counts ic JOIN products p ON p.id=ic.product_id LEFT JOIN inventory_batches b ON b.id=ic.batch_id ORDER BY ic.created_at DESC").all()}

export function markDamaged(data:{productId:number;quantity:number;reason?:string;photoData?:string}) {
 const q=positiveInt(data.quantity,"Количество"); const db=getDb(); return db.transaction(()=>{ const stock=db.prepare("SELECT quantity FROM stock WHERE product_id=?").get(data.productId) as {quantity:number}|undefined; if(!stock||stock.quantity<q) throw new Error("Недостаточно товара на складе"); let left=q; const batches=db.prepare("SELECT id,quantity_available FROM inventory_batches WHERE product_id=? AND quantity_available>0 ORDER BY expiry_date,id").all(data.productId) as Array<{id:number;quantity_available:number}>; for(const b of batches){const take=Math.min(left,b.quantity_available);if(take){db.prepare("UPDATE inventory_batches SET quantity_available=quantity_available-? WHERE id=?").run(take,b.id);left-=take;}if(!left)break;} db.prepare("UPDATE stock SET quantity=quantity-?,updated_at=datetime('now') WHERE product_id=?").run(q,data.productId); const id=Number(db.prepare("INSERT INTO damaged_goods(product_id,quantity,reason,photo_data) VALUES(?,?,?,?)").run(data.productId,q,data.reason??null,data.photoData??null).lastInsertRowid); db.prepare("INSERT INTO stock_movements(product_id,delta,quantity_after,reason) SELECT ?,?,quantity,? FROM stock WHERE product_id=?").run(data.productId,-q,"yaroqsiz mahsulot",data.productId); return {id}; })();
}
export function getDamagedGoods(){return getDb().prepare("SELECT d.*,p.name product_name FROM damaged_goods d JOIN products p ON p.id=d.product_id ORDER BY d.created_at DESC").all()}
export function getSupplierBalances(){return getDb().prepare(`SELECT s.id,s.name,COALESCE((SELECT SUM(b.quantity_received*COALESCE(b.unit_cost,0)) FROM inventory_batches b WHERE b.supplier_id=s.id),0) purchases,COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.supplier_id=s.id),0) paid FROM suppliers s ORDER BY s.name`).all().map((x:any)=>({...x,debt:Math.max(0,x.purchases-x.paid)}));}
export function createSupplierPayment(data:{supplierId:number;amount:number;note?:string}){const amount=nonNegativeNumber(data.amount,"Сумма");if(amount<=0)throw new Error("Сумма должна быть больше нуля");return Number(getDb().prepare("INSERT INTO supplier_payments(supplier_id,amount,note) VALUES(?,?,?)").run(data.supplierId,amount,data.note??null).lastInsertRowid)}
