"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "магазин", address: "", phone: "", contactPerson: "", paymentDueDate: "", username: "", password: "" });

  const load = () => fetch("/api/clients").then((r) => r.json()).then(setClients);

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", type: "магазин", address: "", phone: "", contactPerson: "", paymentDueDate: "", username: "", password: "" });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Клиенты</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-6 grid grid-cols-2 gap-4 p-5">
          <input className="input" placeholder="Название *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>магазин</option>
            <option>кафе</option>
            <option>ресторан</option>
            <option>киоск</option>
            <option>супермаркет</option>
          </select>
          <input className="input" placeholder="Адрес" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input className="input" placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="Контактное лицо" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <input className="input" type="date" title="Срок оплаты" value={form.paymentDueDate} onChange={(e) => setForm({ ...form, paymentDueDate: e.target.value })} />
          <input className="input" placeholder="Логин клиентского аккаунта" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="input" type="password" minLength={12} placeholder="Пароль аккаунта (мин. 12)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div className="col-span-2">
            <button type="submit" className="btn btn-primary">Сохранить</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Тип</th>
              <th>Адрес</th>
              <th>Телефон</th>
              <th>Контакт</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.name}</td>
                <td>{c.type}</td>
                <td>{c.address ?? "—"}</td>
                <td>{c.phone ?? "—"}</td>
                <td>{c.contactPerson ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
