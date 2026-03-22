"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import VetVangFloat from "@/components/vet-vang/VetVangFloat";
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
  Wallet,
  CreditCard,
  ChevronRight,
  Sparkles,
  BookOpen,
  Plus,
  Flame,
  Zap,
  Trophy,
  LineChart,
  Home,
  Search,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getGamification, getLevelProgress } from "@/lib/gamification";
import { XPToastContainer, useXPToast } from "@/components/gamification/XPToast";
import { WeeklyReportModal } from "@/components/gamification/WeeklyReport";
import { getAuthUserId } from "@/lib/supabase/user-data";
import { migrateLocalStorageToSupabase } from "@/lib/supabase/migrate-local";
import { checkMarketAlerts } from "@/lib/market-alert";

/* ─── Navigation Groups ─── */
const navGroups = [
  {
    label: "TỔNG QUAN",
    items: [
      { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/dashboard/leaderboard", label: "Bảng xếp hạng", icon: Trophy },
    ],
  },
  {
    label: "QUẢN LÝ TÀI CHÍNH",
    items: [
      { href: "/dashboard/budget", label: "Quỹ Chi tiêu", icon: Wallet },
      { href: "/dashboard/debt", label: "Quỹ Nợ", icon: CreditCard },
      { href: "/dashboard/personal-cpi", label: "Lạm phát của tôi", icon: Calculator },
    ],
  },
  {
    label: "THỊ TRƯỜNG",
    items: [
      { href: "/dashboard/sentiment", label: "Nhiệt kế thị trường", icon: Activity },
      { href: "/dashboard/market", label: "Phân tích sâu", icon: LineChart },
      { href: "/dashboard/screener", label: "Lọc Cổ Phiếu", icon: Search },
      { href: "/dashboard/news", label: "Tin tức AI", icon: Newspaper },
      { href: "/dashboard/macro", label: "Xu hướng kinh tế", icon: BarChart3 },
      { href: "/dashboard/housing", label: "Thông tin nhà ở", icon: Home },
    ],
  },
  {
    label: "CỐ VẤN AI",
    items: [
      { href: "/dashboard/risk-profile", label: "Tính cách đầu tư", icon: UserCircle },
      { href: "/dashboard/portfolio", label: "Cố vấn danh mục", icon: PieChart },
      { href: "/dashboard/learn", label: "Bài Học Vẹt", icon: BookOpen },
    ],
  },
];
/* ═══════════════════ GAMIFICATION BAR ═══════════════════ */
function GamificationBar() {
  const [mounted, setMounted] = useState(false);
  const [gam, setGam] = useState<ReturnType<typeof getGamification>>({ xp: 0, level: 0, levelName: "🐣 Vẹt Teen", streak: 0, lastActiveDate: "", actions: [], questCompleted: false });
  const prevXPRef = useRef(0);
  const [xpFlash, setXpFlash] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    // First mount: read from localStorage
    const initial = getGamification();
    setGam(initial);
    prevXPRef.current = initial.xp;
    setMounted(true);

    const t = setInterval(() => {
      const newGam = getGamification();
      if (newGam.xp > prevXPRef.current) {
        setXpFlash(true);
        setTimeout(() => setXpFlash(false), 600);
        prevXPRef.current = newGam.xp;
      }
      setGam(newGam);
    }, 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { current, next, progress, xpToNext } = getLevelProgress(gam.xp);

  return (
    <div className="flex items-center gap-3">
      {/* Streak — fire glow */}
      <motion.div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all",
          gam.streak >= 3
            ? "bg-[#FF6B35]/10 border-[#FF6B35]/20"
            : "bg-white/[0.03] border-white/[0.06]"
        )}
        animate={gam.streak >= 3 ? { boxShadow: ["0 0 0px rgba(255,107,53,0)", "0 0 12px rgba(255,107,53,0.3)", "0 0 0px rgba(255,107,53,0)"] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <Flame className={cn("w-4 h-4", gam.streak >= 3 ? "text-[#FF6B35]" : "text-white/20")} />
        <span className={cn("text-xs font-black font-mono", gam.streak >= 3 ? "text-[#FF6B35]" : "text-white/30")}>
          {gam.streak || 0}
        </span>
      </motion.div>

      {/* Level badge — click to open Weekly Report */}
      <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-[#E6B84F]/20 hover:bg-[#E6B84F]/5 transition-all cursor-pointer">
        <span className="text-sm">{current.emoji}</span>
        <span className="text-[10px] text-white/40 font-medium">{current.name.split(" ").slice(1).join(" ")}</span>
      </button>
      <WeeklyReportModal isOpen={showReport} onClose={() => setShowReport(false)} />

      {/* XP counter + progress */}
      <motion.div
        className={cn(
          "flex items-center gap-2.5 px-3 py-1 rounded-lg border transition-all",
          xpFlash
            ? "bg-[#E6B84F]/10 border-[#E6B84F]/30"
            : "bg-white/[0.03] border-white/[0.06]"
        )}
        animate={xpFlash ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Zap className={cn("w-3.5 h-3.5", xpFlash ? "text-[#E6B84F]" : "text-white/20")} />
        <span className={cn(
          "text-xs font-black font-mono tabular-nums",
          xpFlash ? "text-[#E6B84F]" : "text-white/50"
        )}>
          {gam.xp}
        </span>
        <div className="w-20 h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#E6B84F] to-[#FFD700]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
        {next && (
          <span className="text-[9px] text-white/20 font-mono whitespace-nowrap">{xpToNext}→{next.emoji}</span>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════ SIDEBAR ═══════════════════ */
function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [setupStatus, setSetupStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const check = () => {
      const hasBudget = !!localStorage.getItem("vietfi_pots") && JSON.parse(localStorage.getItem("vietfi_pots") || "[]").length > 0;
      const hasDebts = !!localStorage.getItem("vietfi_debts") && JSON.parse(localStorage.getItem("vietfi_debts") || "[]").length > 0;
      const hasOnboarding = !!localStorage.getItem("vietfi_onboarding");
      setSetupStatus({
        "/dashboard/budget": hasBudget,
        "/dashboard/debt": hasDebts || (hasOnboarding && !JSON.parse(localStorage.getItem("vietfi_onboarding") || "{}").hasDebt),
        "/dashboard/risk-profile": hasOnboarding,
        "/dashboard/portfolio": hasOnboarding,
        "/dashboard/personal-cpi": hasBudget,
      });
    };
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  // ── Market volatility alerts (client-side, no cron needed) ──
  useEffect(() => {
    checkMarketAlerts().catch(() => {});
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[260px] bg-[#0A0B0F]/95 backdrop-blur-xl border-r border-white/[0.06] z-50 transition-transform duration-300 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-[60px] px-5 flex items-center justify-between border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.2)]">
              <TrendingUp className="w-4.5 h-4.5 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[15px] leading-tight">
                <span className="text-gradient">VietFi</span>
                <span className="text-white/60 font-normal ml-1 text-xs">Advisor</span>
              </span>
            </div>
          </Link>
          <button onClick={onClose} className="md:hidden text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-semibold tracking-[0.15em] text-white/25 uppercase font-mono">
                  {group.label}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 group",
                        active
                          ? "bg-[#E6B84F]/10 text-[#E6B84F] font-medium"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-[#E6B84F]" : "text-white/30")} />
                      <span className="flex-1">{item.label}</span>
                      {setupStatus[item.href] !== undefined && (
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          setupStatus[item.href] ? "bg-[#22C55E]" : "bg-white/15"
                        )} />
                      )}
                      {active && <ChevronRight className="w-3 h-3 text-[#E6B84F]/50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Vẹt Vàng Mini Card */}
        <div className="px-3 pb-3">
          <div className="glass-card p-3 border-[#E6B84F]/10">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E6B84F]" />
              <span className="text-xs font-medium text-white/70">Vẹt Vàng AI</span>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed">
              🦜 &ldquo;Hôm nay nhớ ghi chi tiêu nha, đừng để cuối tháng hỏi tiền đi đâu!&rdquo;
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/20 font-mono">VietFi v1.0</span>
            <span className="text-[10px] text-white/20 font-mono">WDA 2026</span>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════ LAYOUT ═══════════════════ */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Trigger one-time localStorage → Supabase migration if logged in
  useEffect(() => {
    getAuthUserId().then((userId) => {
      if (userId) {
        migrateLocalStorageToSupabase(userId);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Top bar (mobile) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0A0B0F]/90 backdrop-blur-xl border-b border-white/[0.06] z-30 flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
        >
          <Menu className="w-4 h-4 text-white/60" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="font-bold text-sm text-gradient">VietFi</span>
        </div>
      </div>

      {/* Desktop Top Bar — XP + Streak */}
      <div className="hidden md:flex fixed top-0 left-[260px] right-0 h-12 bg-[#0A0B0F]/80 backdrop-blur-xl border-b border-white/[0.04] z-30 items-center px-6 justify-end gap-4">
        <GamificationBar />
      </div>

      {/* Main content */}
      <main className="md:ml-[260px] min-h-screen pt-14 md:pt-12">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>

      {/* Vẹt Vàng Floating Chatbot */}
      <VetVangFloat />

    </div>
  );
}
