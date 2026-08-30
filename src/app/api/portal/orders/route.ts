import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/init";
import { currentUser } from "@/lib/auth";
import { createOrder, getAllOrders } from "@/lib/queries";
export async function GET(){ ensureSeeded(); const u=await currentUser(); if(!u?.client_id) return NextResponse.json({error:"Доступ только для клиента"},{status:403}); return NextResponse.json(getAllOrders().filter(o=>o.clientId===u.client_id)); }
export async function POST(req:NextRequest){ ensureSeeded(); const u=await currentUser(); if(!u?.client_id) return NextResponse.json({error:"Доступ только для клиента"},{status:403}); try { const b=await req.json(); return NextResponse.json(createOrder({clientId:u.client_id,deliveryDate:b.deliveryDate,notes:b.notes,items:b.items}),{status:201}); } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Ошибка заказа"},{status:400}); } }
