import { NextRequest, NextResponse } from "next/server";
import { destroySession, sessionCookie } from "@/lib/auth";
export async function POST(req: NextRequest) { destroySession(req.cookies.get(sessionCookie.name)?.value); const res=NextResponse.json({ok:true}); res.cookies.set(sessionCookie.name,"",{...sessionCookie.options,maxAge:0}); return res; }
