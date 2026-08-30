import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { getDb } from "@/lib/db";

import { currentUser } from "@/lib/auth";
export async function GET() {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const rows = getDb().prepare(`
    SELECT p.name, p.sku, SUM(oi.quantity) quantity, SUM(oi.quantity * oi.unit_price) revenue
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status <> 'отменён'
    GROUP BY p.id ORDER BY revenue DESC
  `).all() as Array<{name:string;sku:string;quantity:number;revenue:number}>;
  const header = "Товар;SKU;Продано коробок;Выручка\n";
  const csv = header + rows.map((r) => `${r.name};${r.sku};${r.quantity};${r.revenue}`).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=sales-report.csv" } });
}
