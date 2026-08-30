"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { StockItem } from "@/lib/types";

export default function WarehousePage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [damaged, setDamaged] = useState<any[]>([]);

  const load = () => { fetch("/api/stock").then((r) => r.json()).then(setStock); fetch("/api/damaged").then((r) => r.json()).then(setDamaged); };

  useEffect(() => {
    load();
  }, []);

  const adjust = async (productId: number, delta: number) => {
    await fetch("/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, delta }),
    });
    load();
  };

  const markDamaged = async (productId:number) => { const quantity=Number(prompt("Yaroqsiz qutilar soni")); if(!Number.isInteger(quantity)||quantity<1)return; const reason=prompt("Sababi")||""; const r=await fetch("/api/damaged",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,quantity,reason})}); if(!r.ok) alert((await r.json()).error||"Xatolik"); load(); };
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Склад</h1>
      <p className="mb-6 text-sm text-slate-500">Остатки в коробках. Красным — ниже минимального уровня.</p>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Продукт</th>
              <th>SKU</th>
              <th>Категория</th>
              <th>Остаток</th>
              <th>Мин.</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s) => {
              const low = s.quantity <= (s.product?.minStock ?? 0);
              const markDamaged = async (productId:number) => { const quantity=Number(prompt("Yaroqsiz qutilar soni")); if(!Number.isInteger(quantity)||quantity<1)return; const reason=prompt("Sababi")||""; const r=await fetch("/api/damaged",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,quantity,reason})}); if(!r.ok) alert((await r.json()).error||"Xatolik"); load(); };
  return (
                <tr key={s.productId}>
                  <td className="font-medium">{s.product?.name}</td>
                  <td className="font-mono text-xs">{s.product?.sku}</td>
                  <td>{s.product?.category}</td>
                  <td className={low ? "text-lg font-bold text-red-600" : "text-lg font-semibold"}>
                    {s.quantity} кор.
                  </td>
                  <td>{s.product?.minStock}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary !px-2"
                        onClick={() => adjust(s.productId, -1)}
                        disabled={s.quantity <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <button className="btn btn-secondary !px-2 text-red-600" title="Yaroqsiz deb belgilash" onClick={() => markDamaged(s.productId)}>!</button><button className="btn btn-secondary !px-2" onClick={() => adjust(s.productId, 1)}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="card mt-6 overflow-hidden"><div className="p-5 font-semibold text-red-700">Yaroqsiz mahsulotlar</div><table className="data-table"><thead><tr><th>Tovar</th><th>Miqdor</th><th>Sabab</th><th>Sana</th></tr></thead><tbody>{damaged.map(d=><tr key={d.id}><td>{d.product_name}</td><td className="text-red-600">{d.quantity} kor.</td><td>{d.reason||"—"}</td><td>{d.created_at}</td></tr>)}</tbody></table></div>
    </div>
  );
}
