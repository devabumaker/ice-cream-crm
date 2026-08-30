import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { currentUser } from "@/lib/auth";
import { createPayment, getPayments, getReceivables } from "@/lib/queries";
export async function GET(){ensureSeeded();if(!(await currentUser()))return NextResponse.json({error:"Требуется авторизация"},{status:401});return NextResponse.json({payments:getPayments(),receivables:getReceivables()});}
export async function POST(req:NextRequest){ensureSeeded();if(!(await currentUser()))return NextResponse.json({error:"Требуется авторизация"},{status:401});try{return NextResponse.json({id:createPayment(await req.json())},{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Ошибка оплаты"},{status:400});}}
