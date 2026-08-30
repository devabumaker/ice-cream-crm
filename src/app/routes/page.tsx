"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/Badge";
import type { Client, Route } from "@/lib/types";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    repName: "",
    routeDate: new Date().toISOString().slice(0, 10),
    clientIds: [] as number[],
  });

  const load = () => {
    fetch("/api/routes").then((r) => r.json()).then(setRoutes);
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleClient = (id: number) => {
    setForm((f) => ({
      ...f,
      clientIds: f.clientIds.includes(id) ? f.clientIds.filter((c) => c !== id) : [...f.clientIds, id],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientIds.length) {
      alert("Выберите хотя бы одного клиента");
      return;
    }
    await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", repName: "", routeDate: new Date().toISOString().slice(0, 10), clientIds: [] });
    load();
  };

  const completeStop = async (stopId: number) => {
    await fetch(`/api/routes/stops/${stopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "выполнен" }),
    });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Маршруты торговых представителей</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Новый маршрут
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-6 space-y-4 p-5">
          <div className="grid grid-cols-3 gap-4">
            <input className="input" placeholder="Название маршрута *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Торговый представитель *" required value={form.repName} onChange={(e) => setForm({ ...form, repName: e.target.value })} />
            <input className="input" type="date" value={form.routeDate} onChange={(e) => setForm({ ...form, routeDate: e.target.value })} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Точки маршрута</p>
            <div className="grid grid-cols-2 gap-2">
              {clients.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.clientIds.includes(c.id)}
                    onChange={() => toggleClient(c.id)}
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Создать</button>
        </form>
      )}

      <div className="space-y-4">
        {routes.map((route) => (
          <div key={route.id} className="card p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">{route.name}</p>
                <p className="text-sm text-slate-500">
                  {route.repName} · {route.routeDate}
                </p>
              </div>
              <Badge status={route.status} />
            </div>
            <ol className="space-y-2">
              {route.stops?.map((stop) => (
                <li
                  key={stop.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                      {stop.sequence}
                    </span>
                    <div>
                      <p className="font-medium">{stop.client?.name}</p>
                      <p className="text-xs text-slate-500">{stop.client?.address ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={stop.status} />
                    {stop.status !== "выполнен" && (
                      <button
                        className="btn btn-secondary !px-2"
                        title="Отметить выполненным"
                        onClick={() => completeStop(stop.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
