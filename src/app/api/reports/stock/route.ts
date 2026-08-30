import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { getStockMovements } from "@/lib/queries";

import { currentUser } from "@/lib/auth";
export async function GET() {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  return NextResponse.json(getStockMovements());
}
