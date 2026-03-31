"use client";

import { useState, useEffect, useMemo } from "react";
import type { NewsArticle, NewsSentimentLabel } from "@/lib/news/crawler";
import dynamic from "next/dynamic";
import { isFirstTimeUser } from "@/lib/onboarding-state";
import { cn } from "@/lib/utils";
import { getBudgetPots, getExpenses, getIncome, getRiskResult, getMarketCache } from "@/lib/storage";
import { getGamification, getLevelProgress } from "@/lib/gamification";
import { BASE_ALLOCATIONS, adjustAllocation, type AllocationItem } from "@/lib/constants/allocations";

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
} from "lucide-react";
import Link from "next/link";

const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });

const QuickSetupWizard = dynamic(() => import("@/components/onboarding/QuickSetupWizard"), { ssr: false });

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
  { title: "Đang tải tin tức...", source: "VietFi", time: "", sentiment: "neutral" },
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

/* ═══════════════════ INLINE COMPONENTS ═══════════════════ */

function PortfolioMini({ allocation }: { allocation: AllocationItem[] }) {
  const pctFormatter = (value: unknown) => `${value}%`;
  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Gợi ý phân bổ</h3>
        <Link
          href="/dashboard/portfolio"
          className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider"
        >
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
                stroke="none"
              >
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
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-white/50">{item.asset}</span>
              </div>
              <span className="text-xs font-medium text-white/80">{item.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function BriefCard({ brief, loading }: { brief: BriefData | null; loading: boolean }) {
  if (loading || !brief) {
    return (
      <motion.div
        variants={fadeIn}
        className="glass-card p-5 border-[#E6B84F]/10 col-span-full animate-pulse"
      >
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
      className="glass-card p-5 border-[#E6B84F]/10 col-span-full relative overflow-hidden"
    >
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
            }`}
          >
            {brief.source === "gemini" ? "Gemini" : "Fallback"}
          </span>
          <span className="text-[10px] text-white/20 ml-auto flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {brief.date}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{brief.title}</h2>
        <p className="text-[13px] text-white/50 leading-relaxed mb-4">{brief.summary}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {brief.takeaways.map((t: { emoji: string; asset: string; text: string }, i: number) => (
            <div key={i} className="flex items-start gap-2 bg-white/[0.02] rounded-lg p-2.5">
              <span className="text-sm flex-shrink-0">{t.emoji}</span>
              <div>
                <span className="text-[11px] font-semibold text-white/70">{t.asset}</span>
                <p className="text-[11px] text-white/40 leading-relaxed">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function NewsFeed({ items, loading }: { items: NewsItem[]; loading: boolean }) {
  const [activeTab, setActiveTab] = useState("Tất cả");
  const TABS = ["Tất cả", "Trang chủ", "Kinh tế vĩ mô", "Chứng khoán", "Bất động sản", "Khác"];

  const filteredItems = useMemo(() => {
    if (loading || !items.length) return [];
    if (activeTab === "Tất cả") return items.slice(0, 6);
    if (activeTab === "Khác") return items.filter(i => !["Trang chủ", "Kinh tế vĩ mô", "Chứng khoán", "Bất động sản"].includes(i.category || "")).slice(0, 6);
    return items.filter(i => i.category === activeTab).slice(0, 6);
  }, [items, activeTab, loading]);

  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Tin tức mới nhất</h3>
        <Link
          href="/dashboard/news"
          className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider"
        >
          Tất cả <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch", msOverflowStyle: "-ms-autohiding-scrollbar" }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-semibold transition-colors ${
              activeTab === tab
                ? "bg-[#E6B84F] text-[#111318]"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] animate-pulse">
              <div className="h-4 bg-white/[0.06] rounded w-full mb-2" />
              <div className="h-3 bg-white/[0.06] rounded w-1/3" />
            </div>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-6 text-xs text-white/30 italic">Không có tin tức nào trong danh mục này</div>
        ) : (
          filteredItems.map((n: NewsItem, i: number) => {
            const s = sentimentTag[n.sentiment] || sentimentTag.neutral;
            return (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <p className="text-[13px] text-white/80 line-clamp-2 mb-1.5 group-hover:text-white transition-colors">
                  {n.title}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/25">{n.source}</span>
                  <span className="text-[10px] text-white/25 flex items-center gap-0.5" title={n.time}>
                    <Clock className="w-2.5 h-2.5" />
                    {n.time.includes("vừa xong") ? "Mới đây" : n.time}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto whitespace-nowrap"
                    style={{ color: s.color, backgroundColor: `${s.color}12` }}
                  >
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
  const [gam, setGam] = useState<ReturnType<typeof getGamification>>({ xp: 0, level: 0, levelName: "🐣 Vẹt Teen", streak: 0, lastActiveDate: "", actions: [], questCompleted: false });

  useEffect(() => {
    setGam(getGamification());
    setMounted(true);
  }, []);

  const { current, progress } = getLevelProgress(gam.xp);

  return (
    <motion.div variants={fadeIn} className="glass-card p-5 border-[#E6B84F]/10">
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
          <span className="text-[10px] text-white/30">Lvl {mounted ? gam.level + 1 : "--"}</span>
          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#E6B84F] to-[#FF6B35] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${mounted ? progress : 0}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <span className="text-[10px] text-[#E6B84F]">{mounted ? gam.xp : "--"} XP</span>
        </div>
        <span className="text-[10px] text-white/20">{mounted ? current.name : "🐣 Vẹt Teen"}</span>
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
        const resp = await fetch("/api/morning-brief", { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data || !data.summary) throw new Error("Invalid brief payload");
        setAiBrief({
          date: data.date || `Hôm nay, ${new Date().toLocaleDateString("vi-VN")}`,
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
      0
    );
    const spentTotal = expenses.reduce(
      (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
      0
    );
    const net = potTotal - spentTotal;

    const hasData = pots.length > 0 || expenses.length > 0;
    const computedNetWorth = hasData ? net : income ? income * 2.5 : 0;

    setNetWorth(computedNetWorth);
    setMonthlyDeltaPct(income > 0 ? Math.round((net / income) * 100) : 0);
    setAssetSummary(
      income > 0
        ? `Đã lưu thu nhập: ${new Intl.NumberFormat("vi-VN").format(income)} ₫`
        : "Chưa có thu nhập"
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
      fgScore = Math.round(Math.max(0, Math.min(100, 50 + vn * 1.5 - gold * 1.2)));
    }

    if (!riskResult) {
      return adjustAllocation(BASE_ALLOCATIONS.balanced, fgScore);
    }

    const score = riskResult?.score ?? 0;
    const riskType = score <= 6 ? "conservative" : score <= 10 ? "balanced" : "growth";
    const base = BASE_ALLOCATIONS[riskType] || BASE_ALLOCATIONS.balanced;
    return adjustAllocation(base, fgScore);
  }, []);

  // Init: run once on mount
  useEffect(() => {
    if (isFirstTimeUser()) setShowSetup(true);
    fetchNews();

    const handleStorage = (event: StorageEvent) => {
      if (["vietfi_pots", "vietfi_expenses", "vietfi_income"].includes(event.key ?? "")) {
        // Re-compute net worth from localStorage
        const pots = getBudgetPots();
        const expenses = getExpenses();
        const income = getIncome();
        const potTotal = pots.reduce(
          (sum, pot) => sum + (Number.isFinite(pot.allocated) ? pot.allocated : 0),
          0
        );
        const spentTotal = expenses.reduce(
          (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
          0
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
    if (liveArticles.length === 0) return FALLBACK_NEWS;
    return liveArticles.map((a) => ({
      title: a.title,
      source: a.source,
      time: formatTimeAgo(a.published),
      sentiment: a.sentiment,
      category: a.category,
    }));
  }, [liveArticles]);

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
        {/* Net Worth Banner */}
        <motion.div variants={fadeIn} className="mb-4">
          <div className="glass-card p-5 border-[#E6B84F]/10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">
                    TỔNG TÀI SẢN ƯỜC TÍNH
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl md:text-4xl font-black text-white">
                      {netWorth !== null ? `${(netWorth / 1_000_000).toFixed(1)} triệu` : "--"}
                      <span className="text-lg text-white/40"> ₫</span>
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        monthlyDeltaPct >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                      }`}
                    >
                      {monthlyDeltaPct >= 0 ? "+" : ""}
                      {monthlyDeltaPct}% tháng này
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">{assetSummary}</p>
                </div>
                <div suppressHydrationWarning className="hidden sm:flex items-center gap-2 text-[10px] text-white/20 font-mono">
                  <Calendar className="w-3 h-3" />
                  {new Date().toLocaleDateString("vi-VN")}
                </div>
              </div>
              {/* Quick Actions */}
              <div className="flex gap-2 mt-4">
                <Link
                  href="/dashboard/budget"
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#E6B84F]/10 text-[#E6B84F] text-[11px] font-medium rounded-lg hover:bg-[#E6B84F]/20 transition-colors border border-[#E6B84F]/10"
                >
                  <PencilLine className="w-3 h-3" />
                  Ghi chi tiêu
                </Link>
                <Link
                  href="/dashboard/budget"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] text-white/50 text-[11px] font-medium rounded-lg hover:bg-white/[0.08] transition-colors border border-white/[0.06]"
                >
                  <Wallet className="w-3 h-3" />
                  Cập nhật lương
                </Link>
                <Link
                  href="/dashboard/budget"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] text-white/50 text-[11px] font-medium rounded-lg hover:bg-white/[0.08] transition-colors border border-white/[0.06]"
                >
                  <BarChart3 className="w-3 h-3" />
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
        <motion.div variants={stagger} className="grid lg:grid-cols-2 gap-3 mb-4">
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
