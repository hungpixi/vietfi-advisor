"use client";
// Force HMR rebuild to fix Next.js hydration cache mismatch

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { CyberBackground } from "@/components/ui/CyberBackground";
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
  LogOut,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getGamification, getLevelProgress } from "@/lib/gamification";
import {
  XPToastContainer,
  useXPToast,
} from "@/components/gamification/XPToast";
import { WeeklyReportModal } from "@/components/gamification/WeeklyReport";
import { getAuthUserId } from "@/lib/supabase/user-data";
import { migrateLocalStorageToSupabase } from "@/lib/supabase/migrate-local";
import { checkMarketAlerts } from "@/lib/market-alert";
import {
  getBudgetPots,
  getDebts,
  getOnboardingState,
  getLessonsDone,
  getStreakFreeze as storageGetStreak,
  setStreakFreeze,
  clearAllUserData,
} from "@/lib/storage";

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
      { href: "/dashboard/cashflow", label: "Dòng tiền", icon: Wallet },
      { href: "/dashboard/debt", label: "Quỹ nợ", icon: CreditCard },
      {
        href: "/dashboard/spending-insights",
        label: "Phân tích chi tiêu",
        icon: Calculator,
      },
    ],
  },
  {
    label: "THỊ TRƯỜNG",
    items: [
      {
        href: "/dashboard/market-overview",
        label: "Tổng quan thị trường",
        icon: Activity,
      },
      { href: "/dashboard/screener", label: "Lọc cổ phiếu", icon: Search },
      { href: "/dashboard/news", label: "Tin tức AI", icon: Newspaper },
      { href: "/dashboard/backtest", label: "Backtest Pro", icon: LineChart },
    ],
  },
  {
    label: "KẾ HOẠCH LỚN",
    items: [{ href: "/dashboard/housing", label: "Nhà ở", icon: Home }],
  },
  {
    label: "CỐ VẤN AI",
    items: [
      {
        href: "/dashboard/risk-profile",
        label: "Tính cách đầu tư",
        icon: UserCircle,
      },
      {
        href: "/dashboard/portfolio",
        label: "Cố vấn danh mục",
        icon: PieChart,
      },
      { href: "/dashboard/gurus", label: "Cố vấn Lão làng", icon: Sparkles },
      { href: "/dashboard/learn", label: "Bài Học Vẹt", icon: BookOpen },
    ],
  },
];
/* ═══════════════════ GAMIFICATION BAR ═══════════════════ */
function GamificationBar() {
  const [mounted, setMounted] = useState(false);
  const [gam, setGam] = useState<ReturnType<typeof getGamification>>({
    xp: 0,
    level: 0,
    levelName: "🐣 Vẹt Teen",
    streak: 0,
    lastActiveDate: "",
    actions: [],
    questCompleted: false,
  });
  const prevXPRef = useRef(0);
  const [xpFlash, setXpFlash] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    // First mount: read from localStorage
    const initial = getGamification();
    const timer = window.setTimeout(() => {
      setGam(initial);
      prevXPRef.current = initial.xp;
      setMounted(true);
    }, 0);

    const t = setInterval(() => {
      const newGam = getGamification();
      if (newGam.xp > prevXPRef.current) {
        setXpFlash(true);
        setTimeout(() => setXpFlash(false), 600);
        prevXPRef.current = newGam.xp;
      }
      setGam(newGam);
    }, 1000);
    return () => {
      window.clearTimeout(timer);
      clearInterval(t);
    };
  }, [getGamification]); // Polling from the local storage helper function

  const { current, next, progress, xpToNext } = getLevelProgress(gam.xp);

  return (
    <div className="flex items-center gap-3">
      {/* Streak — fire glow */}
      <motion.div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all",
          gam.streak >= 3
            ? "bg-[#FF6B35]/10 border-[#FF6B35]/20"
            : "bg-white/[0.03] border-white/[0.06]",
        )}
        animate={
          gam.streak >= 3
            ? {
              boxShadow: [
                "0 0 0px rgba(255,107,53,0)",
                "0 0 12px rgba(255,107,53,0.3)",
                "0 0 0px rgba(255,107,53,0)",
              ],
            }
            : {}
        }
        transition={{ repeat: Infinity, duration: 2 }}>
        <Flame
          className={cn(
            "w-4 h-4",
            gam.streak >= 3 ? "text-[#FF6B35]" : "text-white/50",
          )}
        />
        <span
          className={cn(
            "text-xs font-black font-mono",
            gam.streak >= 3 ? "text-[#FF6B35]" : "text-white/90",
          )}>
          {gam.streak || 0}
        </span>
      </motion.div>

      {/* Level badge — click to open Weekly Report */}
      <button
        onClick={() => setShowReport(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.1] hover:border-[#E6B84F]/30 hover:bg-[#E6B84F]/10 transition-all cursor-pointer group">
        <span className="text-base group-hover:scale-110 transition-transform">
          {current.emoji}
        </span>
        <span className="text-xs text-white/90 font-bold uppercase tracking-widest">
          {current.name.split(" ").slice(1).join(" ")}
        </span>
      </button>
      <WeeklyReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />

      {/* XP counter + progress */}
      <motion.div
        className={cn(
          "flex items-center gap-3 px-4 py-1.5 rounded-lg border transition-all",
          xpFlash
            ? "bg-[#E6B84F]/10 border-[#E6B84F]/40"
            : "bg-white/[0.03] border-white/[0.1]",
        )}
        animate={xpFlash ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}>
        <Zap
          className={cn(
            "w-4 h-4",
            xpFlash ? "text-[#E6B84F]" : "text-white/90",
          )}
        />
        <span
          className={cn(
            "text-sm font-black font-mono tabular-nums",
            xpFlash ? "text-[#E6B84F]" : "text-white/70",
          )}>
          {gam.xp}
        </span>
        <div className="w-24 h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#E6B84F] to-[#FFD700]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
        {next && (
          <span className="text-[10px] text-white/90 font-black font-mono whitespace-nowrap tracking-tighter">
            {xpToNext}→{next.emoji}
          </span>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════ SIDEBAR ═══════════════════ */
function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [isGuestSession, setIsGuestSession] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    try {
      const userId = await getAuthUserId();
      const guestCookie =
        typeof document !== "undefined" &&
        document.cookie.includes("vietfi_guest=true");
      const isGuestSession = Boolean(guestCookie && !userId);

      if (isGuestSession) {
        clearAllUserData();
        document.cookie = "vietfi_guest=; path=/; max-age=0";
      }

      await supabase.auth.signOut();
    } catch {
      // Keep going even if auth sign-out fails.
    } finally {
      setShowLogoutConfirm(false);
      setLogoutBusy(false);
      onClose();
      router.push("/");
      router.refresh();
    }
  };

  useEffect(() => {
    let active = true;

    getAuthUserId().then((userId) => {
      if (!active) return;
      const guestCookie =
        typeof document !== "undefined" &&
        document.cookie.includes("vietfi_guest=true");
      setIsGuestSession(Boolean(guestCookie && !userId));
    });

    return () => {
      active = false;
    };
  }, []);

  // ── Market volatility alerts (client-side, no cron needed) ──
  useEffect(() => {
    checkMarketAlerts().catch(() => { });
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

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 18 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12131A] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            >
              <div className="relative bg-gradient-to-b from-[#E6B84F]/10 to-transparent p-6 text-center">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="absolute right-4 top-4 text-white/25 transition-colors hover:text-white/70"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E6B84F]/20 bg-[#E6B84F]/10 text-[#E6B84F] shadow-[0_0_24px_rgba(230,184,79,0.15)]">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.3em] text-white/25">
                  Xác nhận đăng xuất
                </p>
                <h2 className="mb-1 text-xl font-black text-white">
                  {isGuestSession ? "Xoá data rồi thoát?" : "Thoát phiên VietFi?"}
                </h2>
                <p className="text-sm leading-relaxed text-white/70">
                  {isGuestSession
                    ? "Bạn đang ở chế độ Khách. Toàn bộ dữ liệu local sẽ bị xoá sạch trước khi thoát."
                    : "Bạn sẽ đăng xuất khỏi tài khoản hiện tại và quay về màn hình đầu."}
                </p>
              </div>

              <div className="px-5 pb-5">
                <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <Trash2 className="w-4 h-4 text-[#EF4444]" />
                    <span className="font-semibold uppercase tracking-[0.18em] text-white/70">
                      Sẽ xoá
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white/32">
                    {isGuestSession
                      ? "Dữ liệu chi tiêu, quỹ tiền, khoản nợ, gamification, học tập, streak freeze và toàn bộ key local VietFi sẽ bị xoá."
                      : "Bạn chỉ thoát khỏi tài khoản hiện tại, dữ liệu local của tài khoản vẫn được giữ nguyên."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-bold text-white/70 transition-all hover:bg-white/[0.05] hover:text-white"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      setLogoutBusy(true);
                      await handleLogout();
                    }}
                    disabled={logoutBusy}
                    className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm font-black text-[#FCA5A5] transition-all hover:bg-[#EF4444]/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {logoutBusy
                      ? "Đang xử lý..."
                      : isGuestSession
                        ? "Xoá & đăng xuất"
                        : "Đăng xuất"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[260px] bg-[#0A0B0F]/95 backdrop-blur-xl border-r border-white/[0.06] z-50 transition-transform duration-300 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}>
        {/* Logo */}
        <div className="h-[70px] px-6 flex items-center justify-between border-b border-white/[0.1]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-[0_0_25px_rgba(255,215,0,0.3)] group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5.5 h-5.5 text-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-[18px] leading-tight tracking-tight uppercase">
                <span className="text-gradient">VietFi</span>
                <span className="text-white/70 font-bold ml-1 text-xs">
                  Adv
                </span>
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden text-white/70 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 py-4 px-4 overflow-y-auto space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-2.5">
                <span className="text-[12px] font-black tracking-[0.2em] text-white/90 uppercase font-mono">
                  {group.label}
                </span>
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] transition-all duration-300 group",
                        active
                          ? "bg-[#E6B84F]/10 text-[#E6B84F] font-bold shadow-[inset_0_0_20px_rgba(230,184,79,0.05)]"
                          : "text-white/80 hover:text-white hover:bg-white/[0.04]",
                      )}>
                      <item.icon
                        className={cn(
                          "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                          active ? "text-[#E6B84F]" : "text-white/90",
                        )}
                      />
                      <span className="flex-1 font-semibold">{item.label}</span>
                      {active && (
                        <ChevronRight className="w-4 h-4 text-[#E6B84F]/50" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Logout Button */}
          <div className="pt-4 border-t border-white/[0.04]">
            <button
              onClick={() => {
                setShowLogoutConfirm(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] transition-all duration-300 group text-danger/60 hover:text-danger hover:bg-danger/10 text-left"
            >
              <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 text-danger/40 group-hover:text-danger" />
              <span className="flex-1 font-semibold">Đăng xuất</span>
            </button>
          </div>
        </nav>



        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 font-mono">
              VietFi v1.0
            </span>
            <span className="text-[10px] text-white/50 font-mono">
              WDA 2026
            </span>
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
    <div className="relative min-h-screen">
      <CyberBackground />

      <div className="relative z-10 min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Top bar (mobile) */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0A0B0F]/90 backdrop-blur-xl border-b border-white/[0.06] z-30 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Menu className="w-4 h-4 text-white/90" />
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
        <main className="md:ml-[260px] min-h-screen pt-14 md:pt-12 relative overflow-hidden">
          <div className="relative z-10 p-4 md:p-6 lg:p-8 w-full">
            {children}
          </div>
        </main>


      </div>
    </div>
  );
}
