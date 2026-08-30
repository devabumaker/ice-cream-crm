import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { getDashboardStats } from "@/lib/queries";

import { currentUser } from "@/lib/auth";
export async function GET() {
  ensureSeeded();
  if (!(await currentUser())) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  return NextResponse.json(getDashboardStats());
}
