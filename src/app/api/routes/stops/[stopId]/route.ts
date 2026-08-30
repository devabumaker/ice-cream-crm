import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { updateRouteStop } from "@/lib/queries";

import { currentUser } from "@/lib/auth";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ stopId: string }> }) {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const { stopId } = await params;
  const body = await req.json();
  const stop = updateRouteStop(Number(stopId), body);

  if (!stop) {
    return NextResponse.json({ error: "Остановка не найдена" }, { status: 404 });
  }
  return NextResponse.json(stop);
}
