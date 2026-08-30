import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { hasUsers, sessionCookie, setupAdmin } from "@/lib/auth";
export async function GET() { ensureSeeded(); return NextResponse.json({ setupRequired: !hasUsers() }); }
export async function POST(req: NextRequest) { ensureSeeded(); try { const { username, password } = await req.json(); const session = setupAdmin(String(username ?? ""), String(password ?? "")); const res=NextResponse.json({ username: session.username }, { status: 201 }); res.cookies.set(sessionCookie.name, session.token, sessionCookie.options); return res; } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Ошибка настройки"},{status:400}); } }
