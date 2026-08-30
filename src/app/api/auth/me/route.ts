import { NextRequest, NextResponse } from "next/server";
import { getSession, hasUsers } from "@/lib/auth";
import { sessionCookie } from "@/lib/auth";
export async function GET(req:NextRequest) { const user=getSession(req.cookies.get(sessionCookie.name)?.value); return NextResponse.json({user:user?.username??null,setupRequired:!hasUsers()},{status:user?200:401}); }
