import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { getAllRoutes, createRoute } from "@/lib/queries";

import { currentUser } from "@/lib/auth";
export async function GET() {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  return NextResponse.json(getAllRoutes());
}

export async function POST(req: NextRequest) {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  try {
    const route = createRoute(await req.json());
    return NextResponse.json(route, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ошибка создания маршрута" }, { status: 400 });
  }
}
