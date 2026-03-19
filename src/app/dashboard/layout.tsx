"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  LayoutDashboard,
  Newspaper,
  Activity,
  BarChart3,
  PieChart,
  Calculator,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/dashboard/news", label: "Tin tức AI", icon: Newspaper },
  { href: "/dashboard/sentiment", label: "Sentiment", icon: Activity },
  { href: "/dashboard/macro", label: "Vĩ mô", icon: BarChart3 },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/dashboard/personal-cpi", label: "CPI Cá nhân", icon: Calculator },
  { href: "/dashboard/risk-profile", label: "Risk DNA", icon: UserCircle },
];

function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-[#0D0D14] border-r border-[#2A2A3A] z-50 transition-transform duration-300 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#2A2A3A]">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-gradient">VietFi</span>
          </Link>
          <button onClick={onClose} className="md:hidden text-[#8888AA]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  active
                    ? "bg-[#FFD700]/10 text-[#FFD700]"
                    : "text-[#8888AA] hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A3A] text-xs text-[#666680]">
          VietFi v1.0 • WDA 2026
        </div>
      </aside>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Top bar (mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0D0D14]/90 backdrop-blur-lg border-b border-[#2A2A3A] z-30 flex items-center px-4">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="w-5 h-5 text-[#8888AA]" />
        </button>
        <span className="ml-3 font-bold text-gradient">VietFi</span>
      </div>

      {/* Main content */}
      <main className="md:ml-64 min-h-screen pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
