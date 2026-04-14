"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import type { MarketSnapshot } from "@/lib/market-data/crawler";
import { getMarketCache, setMarketCache } from "@/lib/storage";
import { cn } from "@/lib/utils";

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

  return (
    <motion.div
      variants={fadeIn}
      className="glass-card glass-card-hover cursor-default p-4 transition-all"
      data-testid="market-card"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/30">
          {label}
        </span>
        <Icon
          className={cn("h-3.5 w-3.5", positive ? "text-[#22C55E]" : "text-[#EF4444]")}
        />
      </div>
      <div className="text-xl font-bold tracking-tight text-white">{value}</div>
      <span
        className={cn("text-xs font-medium", positive ? "text-[#22C55E]" : "text-[#EF4444]")}
      >
        {positive ? "+" : ""}
        {change}%
      </span>
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
      className="glass-card relative overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(24,28,39,0.96),rgba(12,15,23,0.96))] p-5 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tracking-tight text-white">
            Nhiệt kế thị trường
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
            LIVE
          </span>
          <span className="rounded-full border border-[#f0cf7a]/20 bg-[#f0cf7a]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f6dda0]">
            VN
          </span>
        </div>
        <Link
          href="/dashboard/sentiment"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-[#f6dda0]"
        >
          Chi tiết <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: 180-degree semi-circle gauge */}
        <div className="relative flex w-full md:w-64 flex-shrink-0 flex-col items-center justify-center p-2">
          {/* Main Semi-circle Gauge */}
          <svg viewBox="0 0 160 100" className="w-full overflow-visible">
            {/* Background Arc - Track */}
            <path
              d="M 20 60 A 60 60 0 0 1 140 60"
              fill="none"
              stroke="white"
              strokeWidth="14"
              strokeLinecap="round"
              opacity="0.05"
            />

            {/* Color Segments */}
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
                  strokeWidth={isActive ? 18 : 12}
                  strokeLinecap="round"
                  opacity={isActive ? 1 : 0.25}
                  style={{
                    transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    filter: isActive ? `drop-shadow(0 0 12px ${z.color}40)` : "none"
                  }}
                />
              );
            })}

            {/* Needle indicator */}
            {(() => {
              const rotation = (score / 100) * 180 - 180;
              return (
                <g
                  style={{
                    transformOrigin: "80px 60px",
                    transform: `rotate(${rotation}deg)`,
                    transition: "transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
                  }}
                >
                  <polygon
                    points="80,58 80,62 142,60"
                    fill="white"
                    stroke="#1E293B"
                    strokeWidth="0.5"
                    className="shadow-xl"
                  />
                  <circle cx="80" cy="60" r="5" fill="#1E293B" stroke="white" strokeWidth="2" />
                </g>
              );
            })()}
          </svg>

          {/* Integrated Score & Label - Positioned below pivot to avoid overlap */}
          <div className="absolute top-[68%] flex flex-col items-center">
            <span className="text-[52px] font-black leading-none tracking-tighter text-white drop-shadow-2xl">{score}</span>
            <span
              className="mt-1 text-[11px] font-black uppercase tracking-[0.25em]"
              style={{ color: zone.color }}
            >
              {zone.label}
            </span>
          </div>
        </div>

        {/* Right: 5 metric bars */}
        <div className="flex flex-1 flex-col justify-center gap-4">
          {indicators.map((indicator, index) => {
            const barColor = getIndicatorColor(indicator.value);
            return (
              <div key={indicator.label} className="flex items-center gap-4">
                <span className="w-28 flex-shrink-0 text-[12px] text-white/80 font-semibold tracking-tight">{indicator.label}</span>
                <div className="flex flex-1 items-center gap-4">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05] shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${indicator.value}%` }}
                      transition={{ duration: 1, delay: index * 0.08, ease: "circOut" }}
                      className="h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                      style={{ background: barColor }}
                    />
                  </div>
                  <span className="w-6 flex-shrink-0 text-right text-[12px] font-bold text-white font-mono">
                    {indicator.value}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Professional Insight Box */}
          <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-inner">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
              </div>
              <p className="text-[13px] font-medium leading-relaxed text-white/90">{quote}</p>
            </div>
            <div className="flex items-center gap-2 pl-7">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">{action}</p>
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
