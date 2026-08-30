import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { adjustStock, getAllStock, updateStock } from "@/lib/queries";

import { currentUser } from "@/lib/auth";
export async function GET() {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  return NextResponse.json(getAllStock());
}

export async function POST(req: NextRequest) {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const body = await req.json();

  if (body.productId == null || body.quantity == null) {
    return NextResponse.json({ error: "Укажите productId и quantity" }, { status: 400 });
  }

  try {
    return NextResponse.json(updateStock(Number(body.productId), Number(body.quantity)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка обновления склада" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const body = await req.json();

  if (body.productId == null || body.delta == null) {
    return NextResponse.json({ error: "Укажите productId и delta" }, { status: 400 });
  }

  try {
    return NextResponse.json(adjustStock(Number(body.productId), Number(body.delta)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка изменения склада" }, { status: 400 });
  }
}
