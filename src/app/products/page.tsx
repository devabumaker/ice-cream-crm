"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Product } from "@/lib/types";

type ProductWithStock = Product & { stock: number };

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "UZS", maximumFractionDigits: 0 }).format(n);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "молочное",
    pricePerBox: "",
    unitsPerBox: "12",
    minStock: "5",
    initialStock: "0",
  });

  const load = () => fetch("/api/products").then((r) => r.json()).then(setProducts);

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        pricePerBox: Number(form.pricePerBox),
        unitsPerBox: Number(form.unitsPerBox),
        minStock: Number(form.minStock),
        initialStock: Number(form.initialStock),
      }),
    });
    setForm({ name: "", sku: "", category: "молочное", pricePerBox: "", unitsPerBox: "12", minStock: "5", initialStock: "0" });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Каталог мороженого</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-6 grid grid-cols-3 gap-4 p-5">
          <input className="input" placeholder="Название *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="SKU *" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>молочное</option>
            <option>эскимо</option>
            <option>рожок</option>
            <option>фруктовое</option>
            <option>семейное</option>
            <option>сорбет</option>
          </select>
          <input className="input" type="number" placeholder="Цена за коробку *" required value={form.pricePerBox} onChange={(e) => setForm({ ...form, pricePerBox: e.target.value })} />
          <input className="input" type="number" placeholder="Штук в коробке" value={form.unitsPerBox} onChange={(e) => setForm({ ...form, unitsPerBox: e.target.value })} />
          <input className="input" type="number" placeholder="Мин. остаток" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          <input className="input" type="number" placeholder="Начальный остаток" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
          <div className="col-span-3">
            <button type="submit" className="btn btn-primary">Сохранить</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>SKU</th>
              <th>Категория</th>
              <th>Цена/кор.</th>
              <th>Шт/кор.</th>
              <th>На складе</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.name}</td>
                <td className="font-mono text-xs">{p.sku}</td>
                <td>{p.category}</td>
                <td>{formatMoney(p.pricePerBox)}</td>
                <td>{p.unitsPerBox}</td>
                <td className={p.stock <= p.minStock ? "font-semibold text-red-600" : ""}>
                  {p.stock} кор.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
