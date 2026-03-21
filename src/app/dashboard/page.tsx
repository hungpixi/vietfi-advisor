"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QuickSetupWizard from "@/components/onboarding/QuickSetupWizard";
import { isFirstTimeUser } from "@/lib/onboarding-state";
import { getDailyQuests, type DailyQuest } from "@/lib/gamification";
import type { MarketSnapshot } from '@/lib/market-data/crawler';
import { cn } from "@/lib/utils";
import { ConfettiCannon, QuestCompleteToast } from "@/components/gamification/Celebration";
import { BadgeGrid } from "@/components/gamification/Badges";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Newspaper,
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
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

/* ─── Live market data (via /api/market-data) ─── */
interface MarketCardData {
  label: string;
  value: string;
  change: number;
  icon: typeof TrendingUp;
}

const DEFAULT_MARKET_CARDS: MarketCardData[] = [
  { label: "VN-Index", value: "--", change: 0, icon: TrendingDown },
  { label: "Vàng SJC", value: "--", change: 0, icon: TrendingUp },
  { label: "USD/VND", value: "--", change: 0, icon: TrendingUp },
  { label: "BTC", value: "$83,450", change: -0.8, icon: TrendingDown },
];

function getFgLabel(score: number) {
  if (score < 25) return "Cực kỳ sợ hãi";
  if (score < 45) return "Sợ hãi";
  if (score < 55) return "Trung lập";
  if (score < 75) return "Tham lam";
  return "Cực kỳ tham lam";
}

function getFgColor(score: number) {
  if (score < 25) return "#FF1744";
  if (score < 45) return "#FF5252";
  if (score < 55) return "#E6B84F";
  if (score < 75) return "#22C55E";
  return "#00C853";
}

function calculateFgScore(snapshot: MarketSnapshot | null) {
  if (!snapshot || !snapshot.vnIndex) return 38;
  const vn = snapshot.vnIndex.changePct ?? 0;
  const gold = snapshot.goldSjc?.changePct ?? 0;

  const score = Math.round(Math.max(0, Math.min(100, 50 + vn * 1.5 - gold * 1.2)));
  return score;
}

function buildMarketCards(snapshot: MarketSnapshot | null) {
  if (!snapshot) return DEFAULT_MARKET_CARDS;

  const vnIdx = snapshot.vnIndex;
  const gold = snapshot.goldSjc;
  const fx = snapshot.usdVnd;

  return [
    {
      label: "VN-Index",
      value: vnIdx ? vnIdx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--",
      change: vnIdx?.changePct ?? 0,
      icon: (vnIdx?.changePct ?? 0) >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "Vàng SJC",
      value: gold ? `${(gold.goldVnd / 1_000_000).toFixed(1)}tr` : "--",
      change: gold?.changePct ?? 0,
      icon: (gold?.changePct ?? 0) >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "USD/VND",
      value: fx ? fx.rate.toLocaleString("vi-VN") : "--",
      change: 0,
      icon: fx ? TrendingUp : TrendingDown,
    },
    {
      label: "BTC",
      value: "$83,450",
      change: -0.8,
      icon: TrendingDown,
    },
  ];
}

const portfolioData = [
  { name: "Tiết kiệm", value: 30, color: "#00E5FF" },
  { name: "Vàng", value: 20, color: "#E6B84F" },
  { name: "Chứng khoán", value: 25, color: "#22C55E" },
  { name: "Crypto", value: 10, color: "#AB47BC" },
  { name: "BĐS (REIT)", value: 15, color: "#FF6B35" },
];

const brief = {
  date: "Hôm nay, 17/03/2026",
  title: "Thị trường thận trọng — Vàng lập đỉnh",
  summary: "VN-Index giảm nhẹ 0.3% do áp lực chốt lời nhóm ngân hàng. Vàng SJC tiếp tục lập đỉnh mới 93.5tr. Fed giữ nguyên lãi suất. Khối ngoại bán ròng 200 tỷ.",
  takeaways: [
    { emoji: "🟡", asset: "Vàng", text: "Tiếp tục tăng — giữ, chưa nên mua thêm" },
    { emoji: "🔴", asset: "CK", text: "Áp lực chốt lời — cơ hội tích lũy nếu VN-Index test 1,250" },
    { emoji: "🟢", asset: "TK", text: "Lãi suất 5.2%/năm — vẫn thấp hơn lạm phát" },
    { emoji: "🟣", asset: "Crypto", text: "BTC sideway $83k — xem xét DCA" },
  ],
};

const news = [
  { title: "Vàng SJC lập đỉnh mới 93.5 triệu/lượng", source: "VnExpress", time: "2h", sentiment: "bullish" as const },
  { title: "Fed giữ nguyên lãi suất, cảnh báo lạm phát", source: "CafeF", time: "4h", sentiment: "bearish" as const },
  { title: "NHNN bơm 15.000 tỷ qua OMO", source: "NHNN", time: "5h", sentiment: "neutral" as const },
  { title: "BTC sideway $83k, ETF dòng tiền vào 200M", source: "CoinDesk", time: "6h", sentiment: "bullish" as const },
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

/* ═══════════════════ COMPONENTS ═══════════════════ */

function MarketCard({ label, value, change, icon: Icon }: MarketCardData) {
  const positive = change >= 0;
  return (
    <motion.div variants={fadeIn} className="glass-card glass-card-hover p-4 transition-all cursor-default">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/30">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${positive ? "text-[#22C55E]" : "text-[#EF4444]"}`} />
      </div>
      <div className="text-xl font-bold text-white tracking-tight">{value}</div>
      <span className={`text-xs font-medium ${positive ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
        {positive ? "+" : ""}{change}%
      </span>
    </motion.div>
  );
}

function FGGauge({ score }: { score: number }) {
  const fgLabel = getFgLabel(score);
  const fgColor = getFgColor(score);
  const angle = -90 + (score / 100) * 180;

  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: fgColor }} />
          <h3 className="text-sm font-semibold text-white">Nhiệt kế thị trường</h3>
        </div>
        <Link href="/dashboard/sentiment" className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider">
          Chi tiết <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex items-center justify-center py-2">
        <div className="relative w-44 h-24">
          <svg viewBox="0 0 200 110" className="w-full h-full">
            <defs>
              <linearGradient id="gaugeG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF1744" />
                <stop offset="25%" stopColor="#FF5252" />
                <stop offset="50%" stopColor="#E6B84F" />
                <stop offset="75%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#00C853" />
              </linearGradient>
            </defs>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeG)" strokeWidth="6" strokeLinecap="round" opacity="0.2" />
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeG)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 251} 251`} />
            <line x1="100" y1="100"
              x2={100 + 55 * Math.cos((angle * Math.PI) / 180)}
              y2={100 + 55 * Math.sin((angle * Math.PI) / 180)}
              stroke={fgColor} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="100" r="4" fill={fgColor} />
          </svg>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <div className="text-3xl font-black" style={{ color: fgColor }}>{score}</div>
          </div>
        </div>
      </div>
      <div className="text-center mt-1">
        <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: fgColor, backgroundColor: `${fgColor}12` }}>
          {fgLabel}
        </span>
      </div>
    </motion.div>
  );
}

function PortfolioMini() {
  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Gợi ý phân bổ</h3>
        <Link href="/dashboard/portfolio" className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider">
          Chi tiết <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex items-center gap-5">
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={portfolioData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                {portfolioData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip
                contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#F5F3EE", fontSize: 11 }}
                formatter={(value: unknown) => `${value}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {portfolioData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-white/50">{item.name}</span>
              </div>
              <span className="text-xs font-medium text-white/80">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function BriefCard() {
  return (
    <motion.div variants={fadeIn} className="glass-card p-5 border-[#E6B84F]/10 col-span-full relative overflow-hidden">
      {/* Subtle gold glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#E6B84F]" />
          <span className="text-[10px] text-[#E6B84F] font-mono uppercase tracking-wider">Morning Brief AI</span>
          <span className="text-[10px] text-white/20 ml-auto flex items-center gap-1">
            <Calendar className="w-3 h-3" />{brief.date}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{brief.title}</h2>
        <p className="text-[13px] text-white/50 leading-relaxed mb-4">{brief.summary}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {brief.takeaways.map((t, i) => (
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

function NewsFeed() {
  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Tin tức mới nhất</h3>
        <Link href="/dashboard/news" className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider">
          Tất cả <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {news.map((n, i) => {
          const s = sentimentTag[n.sentiment];
          return (
            <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group">
              <p className="text-[13px] text-white/80 line-clamp-2 mb-1.5 group-hover:text-white transition-colors">{n.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/25">{n.source}</span>
                <span className="text-[10px] text-white/25 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{n.time}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ color: s.color, backgroundColor: `${s.color}12` }}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function VetVangFloat() {
  return (
    <motion.div variants={fadeIn} className="glass-card p-5 border-[#E6B84F]/10">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-4 h-4 text-[#E6B84F]" />
        <h3 className="text-sm font-semibold text-white">Vẹt Vàng nói gì?</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E6B84F]/10 text-[#E6B84F] font-mono ml-auto">🔥 Mổ Mode</span>
      </div>
      <div className="bg-white/[0.02] rounded-xl p-3 mb-3">
        <p className="text-[13px] text-white/60 italic leading-relaxed">
          &ldquo;3 ngày không mở app rồi nha, tiền thì vẫn bay — giỏi thật đấy 🦜&rdquo;
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Level 2</span>
          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#E6B84F] to-[#FF6B35] rounded-full" style={{ width: "35%" }} />
          </div>
          <span className="text-[10px] text-[#E6B84F]">350 XP</span>
        </div>
        <span className="text-[10px] text-white/20">🐣 Vẹt Teen</span>
      </div>
    </motion.div>
  );
}

function DailyQuestCard() {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const prevDoneRef = useRef(0);
  const questsRef = useRef<DailyQuest[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastQuest, setToastQuest] = useState({ name: "", xp: 0 });

  useEffect(() => {
    const check = () => {
      const q = getDailyQuests();
      const nowDone = q.filter(x => x.completed).length;
      const prev = prevDoneRef.current;
      
      // Quest vừa complete → show toast
      if (nowDone > prev && prev > 0) {
        const justDone = q.find(x => x.completed && !questsRef.current.find(old => old.id === x.id && old.completed));
        if (justDone) {
          setToastQuest({ name: justDone.title, xp: justDone.xp });
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2500);
        }
      }
      // All done → confetti!
      if (nowDone === q.length && nowDone > 0 && prev < q.length) {
        setShowConfetti(true);
      }
      prevDoneRef.current = nowDone;
      questsRef.current = q;
      setQuests(q);
    };
    check();
    const t = setInterval(check, 2000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = quests.filter(q => q.completed).length;
  const allDone = completedCount === quests.length && quests.length > 0;
  const progress = quests.length > 0 ? (completedCount / quests.length) * 100 : 0;

  const questLinks: Record<string, string> = {
    log_expense: "/dashboard/budget",
    check_market: "/dashboard/sentiment",
    setup_budget: "/dashboard/budget",
    read_knowledge: "/dashboard/macro",
  };

  return (
    <>
      <ConfettiCannon active={showConfetti} onDone={() => setShowConfetti(false)} />
      <QuestCompleteToast show={showToast} questName={toastQuest.name} xp={toastQuest.xp} />
      
      <motion.div variants={fadeIn} className={cn(
        "glass-card p-4 mb-4 transition-all duration-500",
        allDone && "border-[#22C55E]/20 shadow-[0_0_20px_rgba(34,197,94,0.08)]"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">{allDone ? "🎉" : "🎯"}</span>
            <h3 className="text-xs font-semibold text-white">Nhiệm vụ hôm nay</h3>
            {/* Progress ring */}
            <div className="relative w-5 h-5">
              <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                <circle
                  cx="10" cy="10" r="8" fill="none"
                  stroke={allDone ? "#22C55E" : "#E6B84F"}
                  strokeWidth="2"
                  strokeDasharray={`${progress * 0.502} 50.2`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/40">
                {completedCount}/{quests.length}
              </span>
            </div>
          </div>
          {allDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] rounded-full font-bold"
            >
              ✅ Xuất sắc!
            </motion.span>
          )}
        </div>
        <div className="space-y-1.5">
          {quests.map((q) => (
            <Link
              key={q.id}
              href={questLinks[q.actionKey] || "/dashboard"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                q.completed
                  ? "bg-[#22C55E]/5 border border-[#22C55E]/10"
                  : "bg-white/[0.02] border border-white/[0.04] hover:border-[#E6B84F]/20 hover:bg-[#E6B84F]/[0.02]"
              )}
            >
              <motion.span
                className="text-sm"
                animate={q.completed ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {q.completed ? "✅" : q.icon}
              </motion.span>
              <div className="flex-1">
                <span className={cn("text-xs font-medium", q.completed ? "text-[#22C55E]/60 line-through" : "text-white/70")}>
                  {q.title}
                </span>
                <p className="text-[10px] text-white/20">{q.description}</p>
              </div>
              <span className={cn(
                "text-[10px] font-mono font-bold",
                q.completed ? "text-[#22C55E]/40" : "text-[#E6B84F]"
              )}>
                +{q.xp} XP
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════ PAGE ═══════════════════ */
export default function DashboardOverview() {
  const [showSetup, setShowSetup] = useState(false);
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const resp = await fetch('/api/market-data');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: MarketSnapshot = await resp.json();
      setMarketSnapshot(data);
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFirstTimeUser()) setShowSetup(true);
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    if (!marketSnapshot) return;
    const timer = setInterval(() => {
      fetchMarketData();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [marketSnapshot, fetchMarketData]);

  const cards = buildMarketCards(marketSnapshot);
  const fgScore = calculateFgScore(marketSnapshot);

  return (
    <>
    {showSetup && (
      <QuickSetupWizard
        onComplete={() => { setShowSetup(false); window.location.reload(); }}
        onSkip={() => setShowSetup(false)}
      />
    )}
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      {/* Net Worth Banner */}
      <motion.div variants={fadeIn} className="mb-4">
        <div className="glass-card p-5 border-[#E6B84F]/10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">TỔNG TÀI SẢN ƯỜC TÍNH</span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl md:text-4xl font-black text-white">156.2 <span className="text-lg text-white/40">triệu ₫</span></span>
                  <span className="text-xs font-medium text-[#22C55E]">+2.3% tháng này</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/20 font-mono">
                <Calendar className="w-3 h-3" />
                17/03/2026
              </div>
            </div>
            {/* Quick Actions */}
            <div className="flex gap-2 mt-4">
              <Link href="/dashboard/budget" className="flex items-center gap-1.5 px-3 py-2 bg-[#E6B84F]/10 text-[#E6B84F] text-[11px] font-medium rounded-lg hover:bg-[#E6B84F]/20 transition-colors border border-[#E6B84F]/10">
                <PencilLine className="w-3 h-3" />
                Ghi chi tiêu
              </Link>
              <Link href="/dashboard/budget" className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] text-white/50 text-[11px] font-medium rounded-lg hover:bg-white/[0.08] transition-colors border border-white/[0.06]">
                <Wallet className="w-3 h-3" />
                Cập nhật lương
              </Link>
              <Link href="/dashboard/budget" className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] text-white/50 text-[11px] font-medium rounded-lg hover:bg-white/[0.08] transition-colors border border-white/[0.06]">
                <BarChart3 className="w-3 h-3" />
                Báo cáo tháng
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Market Metrics Grid */}
      {marketError && (
        <div className="glass-card p-3 mb-4 text-sm text-red-300">
          Lỗi lấy dữ liệu thị trường: {marketError}
        </div>
      )}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((card) => <MarketCard key={card.label} {...card} />)}
      </motion.div>

      {/* Morning Brief — Full width */}
      <motion.div variants={stagger} className="mb-4">
        <BriefCard />
      </motion.div>

      {/* Daily Quests — Duolingo style */}
      <DailyQuestCard />

      {/* Achievement Badges */}
      <motion.div variants={fadeIn} className="glass-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🏅</span>
          <h3 className="text-xs font-semibold text-white">Huy hiệu</h3>
        </div>
        <BadgeGrid />
      </motion.div>

      {/* 3-Column: F&G + Portfolio + Vẹt Vàng */}
      <motion.div variants={stagger} className="grid lg:grid-cols-3 gap-3 mb-4">
        <FGGauge score={fgScore} />
        <PortfolioMini />
        <VetVangFloat />
      </motion.div>

      {/* News */}
      <motion.div variants={stagger}>
        <NewsFeed />
      </motion.div>
    </motion.div>
    </>
  );
}
