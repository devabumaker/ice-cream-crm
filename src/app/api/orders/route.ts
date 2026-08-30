import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { getAllOrders, createOrder } from "@/lib/queries";

import { currentUser } from "@/lib/auth";
export async function GET() {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  return NextResponse.json(getAllOrders());
}

export async function POST(req: NextRequest) {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  try {
    const body = await req.json();
    const order = createOrder(body);
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка создания заказа";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
