"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  IceCreamCone,
  ShoppingCart,
  Warehouse,
  MapPin,
  BarChart3,
  PackageCheck,
  LogOut,
  WalletCards,
  Truck,
  FileText,
  UsersRound,
} from "lucide-react";

const nav = [
  { href: "/", label: "Аналитика", icon: LayoutDashboard },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/products", label: "Каталог", icon: IceCreamCone },
  { href: "/warehouse", label: "Склад", icon: Warehouse },
  { href: "/receipts", label: "Приёмка / партии", icon: PackageCheck },
  { href: "/orders", label: "Заказы", icon: ShoppingCart },
  { href: "/finance", label: "Финансы", icon: WalletCards },
  { href: "/routes", label: "Маршруты", icon: MapPin },
  { href: "/deliveries", label: "Доставка", icon: Truck },
  { href: "/reports", label: "Отчёты", icon: BarChart3 },
  { href: "/documents", label: "Документы", icon: FileText },
  { href: "/team", label: "Команда", icon: UsersRound },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar fixed left-0 top-0 z-20 flex h-full w-64 flex-col text-white">
      <div className="border-b border-white/10 px-6 py-7">
        <div className="flex items-center gap-2">
          <div className="logo-mark"><IceCreamCone className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-bold leading-tight">Team CRM</p>
            <p className="text-xs text-sky-200/70">Управление продажами</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                active ? "active font-semibold" : "text-sky-100/80 hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-sky-100/70">
        <p className="mb-1 font-semibold text-white">Сезон в разгаре</p>
        Следите за остатками и маршрутами каждый день
        <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; }} className="mt-3 flex items-center gap-2 text-sky-100 hover:text-white"><LogOut className="h-3.5 w-3.5"/>Выйти</button>
      </div>
    </aside>
  );
}
