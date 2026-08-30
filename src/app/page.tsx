"use client";

import { useEffect, useState } from "react";
import { Users, IceCreamCone, ShoppingCart, AlertTriangle, MapPin, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import type { DashboardStats } from "@/lib/types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "UZS", maximumFractionDigits: 0 }).format(n);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return <p className="text-slate-500">Загрузка...</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Аналитика</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Клиенты" value={stats.totalClients} icon={Users} />
        <StatCard title="Продукты" value={stats.totalProducts} icon={IceCreamCone} color="green" />
        <StatCard title="Заказы сегодня" value={stats.ordersToday} icon={ShoppingCart} color="amber" />
        <StatCard title="Выручка за месяц" value={formatMoney(stats.revenueMonth)} icon={TrendingUp} color="green" />
        <StatCard title="Низкий остаток" value={stats.lowStockCount} icon={AlertTriangle} color="red" />
        <StatCard title="Активные маршруты" value={stats.activeRoutes} icon={MapPin} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Последние заказы</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Клиент</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.client?.name}</td>
                  <td>{formatMoney(o.totalAmount)}</td>
                  <td>
                    <Badge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-red-600">⚠ Низкий остаток на складе</h2>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-slate-500">Все позиции в норме</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Продукт</th>
                  <th>Остаток</th>
                  <th>Мин.</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="font-semibold text-red-600">{p.quantity} кор.</td>
                    <td>{p.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
