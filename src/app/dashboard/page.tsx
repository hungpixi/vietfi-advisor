"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { NewsArticle, NewsSentimentLabel } from "@/lib/news/crawler";
import dynamic from "next/dynamic";
import { isFirstTimeUser } from "@/lib/onboarding-state";
import { cn } from "@/lib/utils";
import {
  getBudgetPots,
  getExpenses,
  getIncome,
  getRiskResult,
  getMarketCache,
} from "@/lib/storage";
import { getGamification, getLevelProgress } from "@/lib/gamification";
import {
  BASE_ALLOCATIONS,
  adjustAllocation,
  type AllocationItem,
} from "@/lib/constants/allocations";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Sparkles,
  Flame,
  Clock,
  Calendar,
  Wallet,
  PencilLine,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), {
  ssr: false,
});
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), {
  ssr: false,
});
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), {
  ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
  ssr: false,
});

const QuickSetupWizard = dynamic(
  () => import("@/components/onboarding/QuickSetupWizard"),
  { ssr: false },
);

import { BadgeGrid } from "@/components/gamification/Badges";

import { MarketSection } from "./components/MarketSection";
import { DailyQuestSection } from "./components/DailyQuestSection";
import { NotificationBanner } from "./components/NotificationBanner";

// Moved portfolioData calculation into the component using useMemo

interface BriefData {
  date: string;
  title: string;
  summary: string;
  raw?: string;
  takeaways: { emoji: string; asset: string; text: string }[];
  source?: "gemini" | "heuristic";
  stale?: boolean;
}

interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment: NewsSentimentLabel;
  category?: string;
}

// Removed manual client-side brief generation to avoid stale/incorrect mock data.

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "vừa xong";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    title: "Đang tải tin tức...",
    source: "VietFi",
    time: "",
    sentiment: "neutral",
  },
];

const sentimentTag = {
  bullish: { color: "#22C55E", label: "Tích cực" },
  bearish: { color: "#EF4444", label: "Tiêu cực" },
  neutral: { color: "#8B8D96", label: "Trung lập" },
};

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── Animated Counter (Wealthsimple-style) ─── */
function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  duration = 1.8,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const steps = duration * 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else setCount(Math.floor(current));
          }, 16);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("vi-VN", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })}
      {suffix}
    </span>
  );
}

/* ═══════════════════ INLINE COMPONENTS ═══════════════════ */

function PortfolioMini({ allocation }: { allocation: AllocationItem[] }) {
  const pctFormatter = (value: unknown) => `${value}%`;
  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Gợi ý phân bổ</h3>
        <Link
          href="/dashboard/portfolio"
          className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider">
          Chi tiết <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex items-center gap-5">
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocation}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={50}
                paddingAngle={3}
                dataKey="percent"
                stroke="none">
                {allocation.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#111318",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  color: "#F5F3EE",
                  fontSize: 11,
                }}
                formatter={pctFormatter}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {allocation.map((item) => (
            <div key={item.asset} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-white/50">{item.asset}</span>
              </div>
              <span className="text-xs font-medium text-white/80">
                {item.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function BriefCard({
  brief,
  loading,
}: {
  brief: BriefData | null;
  loading: boolean;
}) {
  if (loading || !brief) {
    return (
      <motion.div
        variants={fadeIn}
        className="glass-card p-5 border-[#E6B84F]/10 col-span-full animate-pulse">
        <div className="h-4 bg-white/[0.06] rounded w-32 mb-3" />
        <div className="h-6 bg-white/[0.06] rounded w-3/4 mb-2" />
        <div className="h-4 bg-white/[0.06] rounded w-full mb-4" />
        <div className="grid sm:grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white/[0.03] rounded-lg" />
          ))}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      variants={fadeIn}
      className="glass-card p-5 border-[#E6B84F]/10 col-span-full relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="relative z-10">
        {brief.source === "heuristic" && (
          <div className="text-xs text-[#FFB300] mb-2">
            Không lấy được Morning Brief Gemini, đang hiển thị dữ liệu dự phòng.
          </div>
        )}
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#E6B84F]" />
          <span className="text-[10px] text-[#E6B84F] font-mono uppercase tracking-wider">
            Morning Brief AI
          </span>
          <span
            className={`text-[10px] font-mono ml-2 ${
              brief.source === "gemini" ? "text-[#22C55E]" : "text-[#FFB300]"
            }`}>
            {brief.source === "gemini" ? "Gemini" : "Fallback"}
          </span>
          <span className="text-[10px] text-white/20 ml-auto flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {brief.date}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{brief.title}</h2>
        <p className="text-[13px] text-white/50 leading-relaxed mb-4">
          {brief.summary}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {brief.takeaways.map(
            (t: { emoji: string; asset: string; text: string }, i: number) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-white/[0.02] rounded-lg p-2.5">
                <span className="text-sm flex-shrink-0">{t.emoji}</span>
                <div>
                  <span className="text-[11px] font-semibold text-white/70">
                    {t.asset}
                  </span>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    {t.text}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NewsFeed({ items, loading }: { items: NewsItem[]; loading: boolean }) {
  const [activeTab, setActiveTab] = useState("Tất cả");
  const TABS = [
    "Tất cả",
    "Trang chủ",
    "Kinh tế vĩ mô",
    "Chứng khoán",
    "Bất động sản",
    "Khác",
  ];

  const filteredItems = useMemo(() => {
    if (loading || !items.length) return [];
    if (activeTab === "Tất cả") return items.slice(0, 6);
    if (activeTab === "Khác")
      return items
        .filter(
          (i) =>
            ![
              "Trang chủ",
              "Kinh tế vĩ mô",
              "Chứng khoán",
              "Bất động sản",
            ].includes(i.category || ""),
        )
        .slice(0, 6);
    return items.filter((i) => i.category === activeTab).slice(0, 6);
  }, [items, activeTab, loading]);

  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Tin tức mới nhất</h3>
        <Link
          href="/dashboard/news"
          className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider">
          Tất cả <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-3 mb-1 scrollbar-hide"
        style={{
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "-ms-autohiding-scrollbar",
        }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-semibold transition-colors ${
              activeTab === tab
                ? "bg-[#E6B84F] text-[#111318]"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-2.5 rounded-lg bg-white/[0.02] animate-pulse">
              <div className="h-4 bg-white/[0.06] rounded w-full mb-2" />
              <div className="h-3 bg-white/[0.06] rounded w-1/3" />
            </div>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-6 text-xs text-white/30 italic">
            Không có tin tức nào trong danh mục này
          </div>
        ) : (
          filteredItems.map((n: NewsItem, i: number) => {
            const s = sentimentTag[n.sentiment] || sentimentTag.neutral;
            return (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group">
                <p className="text-[13px] text-white/80 line-clamp-2 mb-1.5 group-hover:text-white transition-colors">
                  {n.title}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/25">{n.source}</span>
                  <span
                    className="text-[10px] text-white/25 flex items-center gap-0.5"
                    title={n.time}>
                    <Clock className="w-2.5 h-2.5" />
                    {n.time.includes("vừa xong") ? "Mới đây" : n.time}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto whitespace-nowrap"
                    style={{ color: s.color, backgroundColor: `${s.color}12` }}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

function VetVangFloatWidget() {
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

  useEffect(() => {
    setGam(getGamification());
    setMounted(true);
  }, []);

  const { current, progress } = getLevelProgress(gam.xp);

  return (
    <motion.div
      variants={fadeIn}
      className="glass-card p-5 border-[#E6B84F]/10">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-4 h-4 text-[#E6B84F]" />
        <h3 className="text-sm font-semibold text-white">Vẹt Vàng nói gì?</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E6B84F]/10 text-[#E6B84F] font-mono ml-auto">
          {gam.streak >= 3 ? "🔥 Mổ Mode" : "💛 Khen Mode"}
        </span>
      </div>
      <div className="bg-white/[0.02] rounded-xl p-3 mb-3">
        <p className="text-[13px] text-white/60 italic leading-relaxed">
          {gam.streak >= 3
            ? `&ldquo;Bản lĩnh đấy! ${gam.streak} ngày liên tục rồi. Cứ tiếp tục xài app đi, tao thề sẽ không mổ cho đến khi mày giàu! 🦜&rdquo;`
            : `&ldquo;Hôm nay nhớ ghi chi tiêu nha, đừng để cuối tháng hỏi tiền đi đâu! Level ${current.name} rồi mà còn lười hả? 🦜&rdquo;`}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">
            Lvl {mounted ? gam.level + 1 : "--"}
          </span>
          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#E6B84F] to-[#FF6B35] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${mounted ? progress : 0}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <span className="text-[10px] text-[#E6B84F]">
            {mounted ? gam.xp : "--"} XP
          </span>
        </div>
        <span className="text-[10px] text-white/20">
          {mounted ? current.name : "🐣 Vẹt Teen"}
        </span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════ PAGE ═══════════════════ */
export default function DashboardOverview() {
  const [showSetup, setShowSetup] = useState(false);
  const [liveArticles, setLiveArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [aiBrief, setAiBrief] = useState<BriefData | null>(null);
  const [aiBriefLoading, setAiBriefLoading] = useState(true);
  const [aiBriefError, setAiBriefError] = useState<string | null>(null);
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [monthlyDeltaPct, setMonthlyDeltaPct] = useState<number>(0);
  const [assetSummary, setAssetSummary] = useState<string>("Chưa có dữ liệu");

  // Morning Brief AI
  useEffect(() => {
    const fetchMorningBrief = async () => {
      setAiBriefLoading(true);
      setAiBriefError(null);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch("/api/morning-brief", {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data || !data.summary) throw new Error("Invalid brief payload");
        setAiBrief({
          date:
            data.date || `Hôm nay, ${new Date().toLocaleDateString("vi-VN")}`,
          title: data.title || "Morning Brief AI",
          summary: data.summary,
          raw: data.raw ?? data.summary,
          takeaways: Array.isArray(data.takeaways) ? data.takeaways : [],
          source: data.source ?? "heuristic",
        });
      } catch {
        setAiBriefError("Không thể tải Morning Brief");
      } finally {
        setAiBriefLoading(false);
      }
    };

    fetchMorningBrief();
  }, []);

  // Net worth from localStorage
  useEffect(() => {
    const pots = getBudgetPots();
    const expenses = getExpenses();
    const income = getIncome();

    const potTotal = pots.reduce(
      (sum, pot) => sum + (Number.isFinite(pot.allocated) ? pot.allocated : 0),
      0,
    );
    const spentTotal = expenses.reduce(
      (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
      0,
    );
    const net = potTotal - spentTotal;

    const hasData = pots.length > 0 || expenses.length > 0;
    const computedNetWorth = hasData ? net : income ? income * 2.5 : 0;

    setNetWorth(computedNetWorth);
    setMonthlyDeltaPct(income > 0 ? Math.round((net / income) * 100) : 0);
    setAssetSummary(
      income > 0
        ? `Đã lưu thu nhập: ${new Intl.NumberFormat("vi-VN").format(income)} ₫`
        : "Chưa có thu nhập",
    );
  }, []);

  // News fetch
  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const resp = await fetch("/api/news");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.articles && Array.isArray(data.articles)) {
        setLiveArticles(data.articles);
      }
    } catch {
      // keep existing articles or empty
    } finally {
      setNewsLoading(false);
    }
  };

  // Portfolio allocation calculation
  const currentAllocation = useMemo(() => {
    const riskResult = getRiskResult();
    const marketSnapshot = getMarketCache();

    // Calculate FG score from cache
    let fgScore = 50;
    if (marketSnapshot?.vnIndex) {
      const vn = marketSnapshot.vnIndex.changePct ?? 0;
      const gold = marketSnapshot.goldSjc?.changePct ?? 0;
      fgScore = Math.round(
        Math.max(0, Math.min(100, 50 + vn * 1.5 - gold * 1.2)),
      );
    }

    if (!riskResult) {
      return adjustAllocation(BASE_ALLOCATIONS.balanced, fgScore);
    }

    const score = riskResult?.score ?? 0;
    const riskType =
      score <= 6 ? "conservative" : score <= 10 ? "balanced" : "growth";
    const base = BASE_ALLOCATIONS[riskType] || BASE_ALLOCATIONS.balanced;
    return adjustAllocation(base, fgScore);
  }, []);

  // Init: run once on mount
  useEffect(() => {
    setMounted(true);
    if (isFirstTimeUser()) setShowSetup(true);
    fetchNews();

    const handleStorage = (event: StorageEvent) => {
      if (
        ["vietfi_pots", "vietfi_expenses", "vietfi_income"].includes(
          event.key ?? "",
        )
      ) {
        // Re-compute net worth from localStorage
        const pots = getBudgetPots();
        const expenses = getExpenses();
        const income = getIncome();
        const potTotal = pots.reduce(
          (sum, pot) =>
            sum + (Number.isFinite(pot.allocated) ? pot.allocated : 0),
          0,
        );
        const spentTotal = expenses.reduce(
          (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
          0,
        );
        const net = potTotal - spentTotal;
        const hasData = pots.length > 0 || expenses.length > 0;
        setNetWorth(hasData ? net : income ? income * 2.5 : 0);
        setMonthlyDeltaPct(income > 0 ? Math.round((net / income) * 100) : 0);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveBrief = aiBrief;
  const briefLoading = aiBriefLoading;

  const liveNews: NewsItem[] = useMemo(() => {
    if (!mounted || liveArticles.length === 0) return [];
    return liveArticles.map((a) => ({
      title: a.title,
      source: a.source,
      time: formatTimeAgo(a.published),
      sentiment: a.sentiment,
      category: a.category,
    }));
  }, [liveArticles, mounted]);

  return (
    <>
      {showSetup && (
        <QuickSetupWizard
          onComplete={() => {
            setShowSetup(false);
            window.location.reload();
          }}
          onSkip={() => setShowSetup(false)}
        />
      )}
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        {/* Net Worth Banner — Wealthsimple-style */}
        <motion.div variants={fadeIn} className="mb-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F1120] via-[#161929] to-[#0D1020] border border-white/[0.07] p-6">
            {/* Layered gradient orbs */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#E6B84F]/8 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#00E5FF]/4 rounded-full blur-[60px] pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
              {/* Left: Identity + animated value */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30">
                    Tổng tài sản ròng
                  </span>
                </div>

                {/* Wealthsimple big number */}
                <div className="mt-2 mb-1">
                  <span className="text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
                    {netWorth !== null && netWorth !== 0 ? (
                      <>
                        <AnimatedCounter target={netWorth / 1_000_000} />
                        <span className="text-2xl md:text-3xl text-white/40 font-semibold ml-1.5">
                          triệu
                        </span>
                        <span className="text-base md:text-lg text-white/30 ml-1">
                          ₫
                        </span>
                      </>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </span>
                </div>

                {/* Delta badge + date */}
                <div className="flex items-center gap-3 mt-2">
                  {monthlyDeltaPct !== 0 && netWorth !== null && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                        monthlyDeltaPct >= 0
                          ? "bg-[#22C55E]/10 text-[#22C55E]"
                          : "bg-[#EF4444]/10 text-[#EF4444]"
                      }`}>
                      {monthlyDeltaPct >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <span className="rotate-180">
                          <TrendingUp className="w-3 h-3" />
                        </span>
                      )}
                      {monthlyDeltaPct >= 0 ? "+" : ""}
                      {monthlyDeltaPct}% tháng này
                    </span>
                  )}
                  <span className="text-[10px] text-white/25 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {mounted
                      ? new Date().toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>

                <p className="text-[11px] text-white/35 mt-2 font-mono">
                  {assetSummary}
                </p>
              </div>

              {/* Right: Quick Actions */}
              <div className="flex flex-col gap-2 sm:items-end sm:justify-start min-w-[160px]">
                <Link
                  href="/dashboard/budget"
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold font-mono uppercase tracking-wide transition-all duration-200 bg-gradient-to-r from-[#E6B84F] to-[#F5A623] text-[#111318] hover:shadow-[0_0_20px_rgba(230,184,79,0.3)] hover:scale-[1.02] active:scale-[0.98]">
                  <PencilLine className="w-3.5 h-3.5" />
                  Ghi chi tiêu
                </Link>
                <Link
                  href="/dashboard/budget"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold font-mono uppercase tracking-wide bg-white/[0.05] text-white/50 border border-white/[0.06] hover:bg-white/[0.09] hover:text-white/70 transition-all duration-200">
                  <Wallet className="w-3.5 h-3.5" />
                  Cập nhật lương
                </Link>
                <Link
                  href="/dashboard/budget"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold font-mono uppercase tracking-wide bg-white/[0.05] text-white/50 border border-white/[0.06] hover:bg-white/[0.09] hover:text-white/70 transition-all duration-200">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Báo cáo tháng
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notification Permission Banner */}
        <NotificationBanner />

        {/* Market Metrics Grid + F&G Gauge */}
        <div className="mb-4">
          <MarketSection />
        </div>

        {/* Morning Brief — Full width */}
        <motion.div variants={stagger} className="mb-4">
          <BriefCard brief={liveBrief} loading={briefLoading} />
        </motion.div>

        {/* Daily Quests — Duolingo style */}
        <DailyQuestSection />

        {/* Achievement Badges */}
        <motion.div variants={fadeIn} className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🏅</span>
            <h3 className="text-xs font-semibold text-white">Huy hiệu</h3>
          </div>
          <BadgeGrid />
        </motion.div>

        {/* 2-Column: Portfolio + Vẹt Vàng */}
        <motion.div
          variants={stagger}
          className="grid lg:grid-cols-2 gap-3 mb-4">
          <PortfolioMini allocation={currentAllocation} />
          <VetVangFloatWidget />
        </motion.div>

        {/* News */}
        <motion.div variants={stagger}>
          <NewsFeed items={liveNews} loading={newsLoading} />
        </motion.div>
      </motion.div>
    </>
  );
}
