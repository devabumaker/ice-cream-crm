import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { getOrderById, updateOrderStatus } from "@/lib/queries";

import { currentUser } from "@/lib/auth";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const { id } = await params;
  const order = getOrderById(Number(id));
  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  if (!body.status) {
    return NextResponse.json({ error: "Укажите status" }, { status: 400 });
  }

  try {
    const order = updateOrderStatus(Number(id), body.status);
    if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    return NextResponse.json(order);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка обновления заказа" }, { status: 400 });
  }
}
