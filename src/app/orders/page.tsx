"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/Badge";
import type { Client, Order, Product } from "@/lib/types";

type ProductWithStock = Product & { stock: number };

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "UZS", maximumFractionDigits: 0 }).format(n);
}

const statuses = ["новый", "в доставке", "доставлен", "отменён"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    deliveryDate: new Date().toISOString().slice(0, 10),
    notes: "",
    items: [{ productId: "", quantity: "1" }],
  });

  const load = () => {
    fetch("/api/orders").then((r) => r.json()).then(setOrders);
    fetch("/api/clients").then((r) => r.json()).then(setClients);
    fetch("/api/products").then((r) => r.json()).then(setProducts);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: Number(form.clientId),
        deliveryDate: form.deliveryDate,
        notes: form.notes || undefined,
        items: form.items
          .filter((i) => i.productId)
          .map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity) })),
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Ошибка");
      return;
    }
    setShowForm(false);
    load();
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Заказы</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Новый заказ
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-6 space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <select className="input" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Выберите клиента</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input className="input" type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
          </div>
          <input className="input" placeholder="Примечание" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div>
            <p className="mb-2 text-sm font-medium">Позиции</p>
            {form.items.map((item, idx) => (
              <div key={idx} className="mb-2 flex gap-2">
                <select
                  className="input flex-1"
                  required
                  value={item.productId}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[idx].productId = e.target.value;
                    setForm({ ...form, items });
                  }}
                >
                  <option value="">Продукт</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.stock} кор.)</option>
                  ))}
                </select>
                <input
                  className="input w-24"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[idx].quantity = e.target.value;
                    setForm({ ...form, items });
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary mt-1"
              onClick={() => setForm({ ...form, items: [...form.items, { productId: "", quantity: "1" }] })}
            >
              + Позиция
            </button>
          </div>

          <button type="submit" className="btn btn-primary">Создать заказ</button>
        </form>
      )}

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="card p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-semibold">
                  Заказ #{o.id} — {o.client?.name}
                </p>
                <p className="text-sm text-slate-500">
                  Доставка: {o.deliveryDate ?? "—"} · {formatMoney(o.totalAmount)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={o.status} />
                <select
                  className="input !w-auto"
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {o.items && o.items.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Продукт</th>
                    <th>Кол-во</th>
                    <th>Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product?.name}</td>
                      <td>{item.quantity} кор.</td>
                      <td>{formatMoney(item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
