import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team CRM",
  description: "Team CRM — управление продажами",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Sidebar />
        <main className="min-h-screen p-4 sm:p-6 lg:ml-64 lg:p-10">{children}</main>
      </body>
    </html>
  );
}
