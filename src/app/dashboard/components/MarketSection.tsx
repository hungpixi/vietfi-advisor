"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowUpRight, Sparkles } from "lucide-react";
import type { MarketSnapshot } from "@/lib/market-data/crawler";
import { getMarketCache, setMarketCache } from "@/lib/storage";
import { cn } from "@/lib/utils";

function usePersistentTime() {
  const [time, setTime] = useState<string>(() =>
    new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 60_000);

    return () => clearInterval(id);
  }, []);

  return time;
}

interface MarketCardData {
  label: string;
  value: string;
  change: number;
  icon: typeof TrendingUp;
}

interface ThermometerZone {
  label: string;
  color: string;
  glow: string;
  min: number;
  max: number;
}

interface MarketThermometerIndicator {
  label: string;
  value: number;
  tone: "fear" | "neutral" | "greed";
}

const DEFAULT_MARKET_CARDS: MarketCardData[] = [
  { label: "VN-Index", value: "--", change: 0, icon: TrendingDown },
  { label: "Vàng SJC", value: "--", change: 0, icon: TrendingUp },
  { label: "USD/VND", value: "--", change: 0, icon: TrendingUp },
  { label: "BTC", value: "$83,450", change: -0.8, icon: TrendingDown },
];

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const ZONES: ThermometerZone[] = [
  { label: "Cực kỳ sợ hãi", color: "#EF4444", glow: "rgba(239, 68, 68, 0.3)", min: 0, max: 20 },
  { label: "Sợ hãi", color: "#F97316", glow: "rgba(249, 115, 22, 0.2)", min: 20, max: 40 },
  { label: "Trung lập", color: "#F1D17A", glow: "rgba(241, 209, 122, 0.2)", min: 40, max: 60 },
  { label: "Tham lam", color: "#22C55E", glow: "rgba(34, 197, 94, 0.2)", min: 60, max: 80 },
  { label: "Cực kỳ tham lam", color: "#10B981", glow: "rgba(16, 185, 129, 0.3)", min: 80, max: 101 },
];

const VERTEX_QUOTES: Record<string, { quote: string; action: string }> = {
  extreme_fear: {
    quote: "Thị trường trong trạng thái bán tháo diện rộng.",
    action: "Theo dõi dòng tiền bắt đáy",
  },
  fear: {
    quote: "Áp lực bán gia tăng, tâm lý chung thận trọng.",
    action: "Ưu tiên quản trị rủi ro",
  },
  neutral: {
    quote: "Thị trường đang duy trì mốc trung lập. Dấu hiệu tích lũy chờ xu hướng mới.",
    action: "Quan sát thanh khoản",
  },
  greed: {
    quote: "Lực cầu cải thiện, tâm lý thị trường tích cực.",
    action: "Chú ý rủi ro phân hóa",
  },
  extreme_greed: {
    quote: "Thị trường hưng phấn cao độ, rủi ro điều chỉnh gia tăng.",
    action: "Cân nhắc chốt lời từng phần",
  },
};

function calculateFgScore(snapshot: MarketSnapshot | null) {
  if (!snapshot || !snapshot.vnIndex) return 48;

  const vn = snapshot.vnIndex.changePct ?? 0;
  const gold = snapshot.goldSjc?.changePct ?? 0;

  return Math.round(Math.max(0, Math.min(100, 50 + vn * 1.5 - gold * 1.2)));
}

function buildMarketCards(
  snapshot: MarketSnapshot | null,
  prevSnapshot: MarketSnapshot | null,
): MarketCardData[] {
  if (!snapshot) return DEFAULT_MARKET_CARDS;

  const vnIdx = snapshot.vnIndex;
  const gold = snapshot.goldSjc;
  const fx = snapshot.usdVnd;

  const usdChange =
    fx && prevSnapshot?.usdVnd
      ? Number(
        ((((fx.rate - prevSnapshot.usdVnd.rate) / prevSnapshot.usdVnd.rate) * 100)).toFixed(2),
      )
      : 0;

  return [
    {
      label: "VN-Index",
      value: vnIdx
        ? vnIdx.price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        : "--",
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
      change: usdChange,
      icon: fx ? (usdChange >= 0 ? TrendingUp : TrendingDown) : TrendingDown,
    },
    {
      label: "BTC",
      value: snapshot.btc
        ? `$${snapshot.btc.priceUsd.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
        : "--",
      change: snapshot.btc ? snapshot.btc.changePct24h : 0,
      icon: snapshot.btc
        ? snapshot.btc.changePct24h >= 0
          ? TrendingUp
          : TrendingDown
        : TrendingDown,
    },
  ];
}

function getVertexZoneKey(score: number) {
  if (score <= 20) return "extreme_fear";
  if (score <= 40) return "fear";
  if (score <= 60) return "neutral";
  if (score <= 80) return "greed";
  return "extreme_greed";
}

function clampMetric(value: number) {
  return Math.max(8, Math.min(92, Math.round(value)));
}

function buildIndicatorMetrics(
  score: number,
  snapshot: MarketSnapshot | null,
): MarketThermometerIndicator[] {
  const vnChange = snapshot?.vnIndex?.changePct ?? 0;
  const goldChange = snapshot?.goldSjc?.changePct ?? 0;
  const btcChange = snapshot?.btc?.changePct24h ?? 0;
  const fxRate = snapshot?.usdVnd?.rate ?? 25_500;
  const fxPressure = (fxRate - 25_500) / 40;

  return [
    {
      label: "Đà giá",
      value: clampMetric(score + vnChange * 10),
      tone: score >= 58 ? "greed" : score <= 42 ? "fear" : "neutral",
    },
    {
      label: "Tin tức",
      value: clampMetric(score + vnChange * 7 - goldChange * 5 + 4),
      tone: score >= 55 ? "greed" : score <= 40 ? "fear" : "neutral",
    },
    {
      label: "Độ rộng",
      value: clampMetric(score + vnChange * 14 + btcChange * 2),
      tone: score >= 52 ? "greed" : score <= 38 ? "fear" : "neutral",
    },
    {
      label: "Vàng",
      value: clampMetric(50 - goldChange * 14 + score * 0.18),
      tone: goldChange > 0.8 ? "fear" : goldChange < -0.4 ? "greed" : "neutral",
    },
    {
      label: "Khối ngoại ròng",
      value: clampMetric(score + vnChange * 8 - fxPressure),
      tone: score >= 57 ? "greed" : score <= 44 ? "fear" : "neutral",
    },
  ];
}

function getIndicatorColor(value: number) {
  if (value > 55) return "#22C55E"; // green-500
  if (value < 45) return "#EF4444"; // red-500
  return "#F1D17A"; // zone-neutral/yellow
}

export function MarketCard({ label, value, change, icon: Icon }: MarketCardData) {
  const positive = change >= 0;
  const color = positive ? "#22C55E" : "#EF4444";

  return (
    <motion.div
      variants={fadeIn}
      className={cn(
        "glass-card relative overflow-hidden group cursor-default p-6 transition-all duration-500 border border-white/[0.05]",
        positive ? "hover:border-[#22C55E]/30" : "hover:border-[#EF4444]/30"
      )}
      data-testid="market-card"
    >
      {/* Decors */}
      <div className="absolute top-0 left-0 w-24 h-24 blur-[40px] pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundColor: color }} />
      <div className="absolute top-0 left-0 w-12 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="absolute top-0 left-0 w-[1px] h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `linear-gradient(180deg, ${color}, transparent)` }} />

      <div className="mb-4 flex items-center justify-between relative z-10 border-b border-white/[0.03] pb-3">
        <span className="text-[12px] font-black font-mono uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">
          {label}
        </span>
        <div className={cn("p-1.5 rounded-lg bg-opacity-10", positive ? "bg-[#22C55E]/10" : "bg-[#EF4444]/10")}>
          <Icon
            className={cn("h-4 w-4", positive ? "text-[#22C55E]" : "text-[#EF4444]")}
          />
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-3xl font-black tracking-tighter text-white mb-1 group-hover:translate-x-1 transition-transform duration-300">{value}</div>
        <div className="flex items-center gap-2">
          <span
            className={cn("text-[13px] font-black font-mono uppercase tracking-widest px-2 py-0.5 rounded", positive ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]")}
          >
            {positive ? "+" : ""}
            {change.toFixed(2)}%
          </span>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>
      </div>
    </motion.div>
  );
}

export function MarketSkeletonCard() {
  return (
    <div data-testid="market-skeleton" className="glass-card animate-pulse p-4">
      <div className="mb-3 h-4 rounded bg-white/[0.1]" />
      <div className="mb-2 h-8 rounded bg-white/[0.1]" />
      <div className="h-3 w-3/4 rounded bg-white/[0.1]" />
    </div>
  );
}

export function FGGauge({
  score,
  snapshot,
}: {
  score: number;
  snapshot: MarketSnapshot | null;
}) {
  const zone = ZONES.find((item) => score >= item.min && score < item.max) ?? ZONES[2];
  const { quote, action } = VERTEX_QUOTES[getVertexZoneKey(score)];
  const indicators = useMemo(() => buildIndicatorMetrics(score, snapshot), [score, snapshot]);

  return (
    <motion.div
      variants={fadeIn}
      className="glass-card relative overflow-hidden group border border-white/10 p-8 shadow-2xl"
    >
      {/* Cyber Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none opacity-20" style={{ backgroundColor: zone.color }} />
      <div className="absolute top-0 left-0 w-32 h-[2px] bg-gradient-to-r from-white/20 to-transparent" />
      <div className="absolute top-0 left-0 w-[2px] h-32 bg-gradient-to-b from-white/20 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-12 relative z-10 border-b border-white/[0.05] pb-6">
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <TrendingUp className="w-5 h-5 text-white/60" />
          </div>
          <div>
            <h3 className="text-[18px] font-black text-white font-heading uppercase tracking-widest flex items-center gap-3">
              Nhiệt kế thị trường <span className="text-white/20 font-mono text-[14px] tracking-widest">- MARKET PHASES</span>
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] font-mono">Real-time Analysis</span>
            </div>
          </div>
        </div>
        <Link
          href="/dashboard/market-overview"
          className="text-[11px] text-white/30 hover:text-white transition-colors flex items-center gap-2 font-black uppercase tracking-[0.2em] font-mono group/link"
        >
          Toàn cảnh <ArrowUpRight className="w-4 h-4 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 relative z-10">
        {/* Left: 180-degree semi-circle gauge */}
        <div className="relative flex w-full lg:w-72 flex-shrink-0 flex-col items-center justify-center pt-4">
          <svg viewBox="0 0 160 100" className="w-full overflow-visible">
            <path
              d="M 20 60 A 60 60 0 0 1 140 60"
              fill="none"
              stroke="white"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.05"
            />

            {ZONES.map((z, i) => {
              const radius = 60;
              const angleStart = -180 + (z.min / 100) * 180;
              const angleEnd = -180 + (z.max / 100) * 180;
              const startRad = (angleStart * Math.PI) / 180;
              const endRad = (angleEnd * Math.PI) / 180;
              const x1 = 80 + radius * Math.cos(startRad);
              const y1 = 60 + radius * Math.sin(startRad);
              const x2 = 80 + radius * Math.cos(endRad);
              const y2 = 60 + radius * Math.sin(endRad);
              const isActive = score >= z.min && (score < z.max || (z.max > 100 && score <= 100));

              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={z.color}
                  strokeWidth={isActive ? 16 : 8}
                  strokeLinecap="round"
                  opacity={isActive ? 1 : 0.2}
                  className="transition-all duration-1000"
                />
              );
            })}

            {(() => {
              const rotation = (score / 100) * 180 - 180;
              return (
                <g style={{ transformOrigin: "80px 60px", transform: `rotate(${rotation}deg)`, transition: "transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                  <circle cx="80" cy="60" r="4" fill="white" />
                  <line x1="80" y1="60" x2="140" y2="60" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="2,2" />
                  <path d="M 135 60 L 142 60" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </g>
              );
            })()}
          </svg>

          <div className="absolute top-[60%] flex flex-col items-center">
            <span className="text-[64px] font-black leading-none tracking-tighter text-white">{score}</span>
            <span
              className="mt-2 text-[11px] font-black uppercase tracking-[0.3em] font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10"
              style={{ color: zone.color }}
            >
              {zone.label}
            </span>
          </div>
        </div>

        {/* Right: Metric bars */}
        <div className="flex-1 space-y-7 py-2">
          {indicators.map((indicator, index) => {
            const barColor = getIndicatorColor(indicator.value);
            return (
              <div key={indicator.label} className="group/bar">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-black font-mono uppercase tracking-widest text-white/40 group-hover/bar:text-white/60 transition-colors">{indicator.label}</span>
                  <span className="text-[14px] font-black text-white font-mono">{indicator.value}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${indicator.value}%` }}
                    transition={{ duration: 1.2, delay: index * 0.1, ease: "circOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: barColor, boxShadow: `0 0 10px ${barColor}40` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Professional Insight Box */}
          <div className="mt-8 relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden group/insight">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover/insight:opacity-40 transition-opacity">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex gap-4 items-start relative z-10">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <p className="text-[15px] font-semibold text-white/90 leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="h-[1px] w-4 bg-emerald-400/30" />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400 font-mono">{action}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function MarketSection({
  onError,
}: {
  onError?: (e: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [prevSnapshot, setPrevSnapshot] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(
    async (isRetry = false) => {
      setLoading(true);
      setError(null);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch("/api/market-data", { signal: controller.signal });
        clearTimeout(timeout);

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data: MarketSnapshot = await resp.json();
        setSnapshot((prev) => {
          setPrevSnapshot(prev);
          return data;
        });
        setMarketCache(data);
      } catch (err: unknown) {
        const cached = getMarketCache();
        if (cached) {
          setSnapshot((prev) => prev || cached);
        }

        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        setError(msg);
        onError?.(msg);

        if (!isRetry) {
          setTimeout(() => fetchMarketData(true), 30000);
        }
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    if (!snapshot) return;

    const timer = setInterval(() => {
      fetchMarketData();
    }, 5 * 60 * 1000);

    return () => clearInterval(timer);
  }, [snapshot, fetchMarketData]);

  useEffect(() => {
    if (!snapshot || typeof window === "undefined") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const alertedKey = `vietfi_alerted_${new Date().toDateString()}`;
    if (sessionStorage.getItem(alertedKey)) return;

    const alerts: string[] = [];
    const vnPct = snapshot.vnIndex?.changePct ?? 0;
    const goldPct = snapshot.goldSjc?.changePct ?? 0;

    if (Math.abs(vnPct) >= 2) {
      alerts.push(`VN-Index ${vnPct > 0 ? "+" : ""}${vnPct.toFixed(1)}%`);
    }
    if (Math.abs(goldPct) >= 3) {
      alerts.push(`Vàng ${goldPct > 0 ? "+" : ""}${goldPct.toFixed(1)}%`);
    }

    if (alerts.length > 0) {
      sessionStorage.setItem(alertedKey, "1");
      new Notification("VietFi - Biến động mạnh!", {
        body: `${alerts.join(" | ")}\nMở dashboard để xem chi tiết.`,
        icon: "/assets/icon-192.png",
        tag: "market-volatility",
      });
    }
  }, [snapshot]);

  const cards = buildMarketCards(snapshot, prevSnapshot);
  const fgScore = calculateFgScore(snapshot);

  return (
    <motion.div variants={stagger} className="space-y-3">
      {error && (
        <div className="glass-card p-3 text-sm text-red-300">
          Lỗi lấy dữ liệu thị trường: {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <MarketSkeletonCard key={idx} />
          ))}
        </div>
      ) : (
        <motion.div variants={stagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <MarketCard key={card.label} {...card} />
          ))}
        </motion.div>
      )}

      <FGGauge score={fgScore} snapshot={snapshot} />
    </motion.div>
  );
}
