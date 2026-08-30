import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { login, sessionCookie, getSession } from "@/lib/auth";
export async function POST(req: NextRequest) { ensureSeeded(); const {username,password}=await req.json(); const session=login(String(username??""),String(password??"")); if(!session) return NextResponse.json({error:"Неверный логин или пароль"},{status:401}); const user=getSession(session.token); const res=NextResponse.json({username:session.username,role:user?.role}); res.cookies.set(sessionCookie.name,session.token,sessionCookie.options); return res; }
