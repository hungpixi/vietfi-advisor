"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
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
  { label: "Cực kỳ sợ hãi", color: "#FF4D6D", glow: "rgba(255, 77, 109, 0.36)", min: 0, max: 20 },
  { label: "Sợ hãi", color: "#FF8A5B", glow: "rgba(255, 138, 91, 0.28)", min: 20, max: 40 },
  { label: "Trung lập", color: "#F1D17A", glow: "rgba(241, 209, 122, 0.28)", min: 40, max: 60 },
  { label: "Tham lam", color: "#4ADE80", glow: "rgba(74, 222, 128, 0.26)", min: 60, max: 80 },
  { label: "Cực kỳ tham lam", color: "#2DD4BF", glow: "rgba(45, 212, 191, 0.34)", min: 80, max: 101 },
];

const VERTEX_QUOTES: Record<string, { quote: string; action: string }> = {
  extreme_fear: {
    quote: "Thị trường đang run, mày mà bình tĩnh thì đang có lợi thế.",
    action: "Canh gom từng nhịp, đừng all-in như phim",
  },
  fear: {
    quote: "Không khí hơi rén, nhưng tiền khôn luôn thích lúc đám đông chùn tay.",
    action: "Ưu tiên cổ phiếu khỏe, giải ngân chậm",
  },
  neutral: {
    quote: "Yên bình trước bão. Đừng vội, đừng hoảng.",
    action: "Follow for opportunity",
  },
  greed: {
    quote: "Nóng lên rồi đó. Hưng phấn quá là dễ mua đúng đỉnh lắm nghe.",
    action: "Canh chốt bớt, giữ đầu lạnh",
  },
  extreme_greed: {
    quote: "FOMO bốc khói luôn rồi. Lúc ai cũng tự tin là lúc phải nghi ngờ.",
    action: "Khóa lãi trước khi thị trường khóa mày",
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

function buildTrendPoints(score: number) {
  return Array.from({ length: 8 }, (_, index) => {
    const wave = Math.sin(index * 0.9 + score / 18) * 8;
    const drift = index * 3.5;
    const base = score - 10 + drift + wave;

    return Math.max(20, Math.min(86, Math.round(base)));
  });
}

function buildTrendPath(points: number[], width: number, height: number) {
  if (points.length === 0) return "";

  const max = Math.max(...points);
  const min = Math.min(...points);
  const spread = Math.max(max - min, 1);
  const stepX = width / Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - ((point - min) / spread) * (height - 10) - 5;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function describeTrend(points: number[]) {
  if (points.length < 2) return "Giữ nhịp";

  const change = points[points.length - 1] - points[0];

  if (change >= 8) return "Đang ấm lên";
  if (change <= -8) return "Hạ nhiệt";
  return "Sideway tỉnh táo";
}

function getIndicatorColor(
  tone: MarketThermometerIndicator["tone"],
  zoneColor: string,
) {
  if (tone === "fear") return "#FF8A80";
  if (tone === "greed") return "#34D399";
  return zoneColor;
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
  const localTime = usePersistentTime();
  const indicators = useMemo(() => buildIndicatorMetrics(score, snapshot), [score, snapshot]);
  const trendPoints = useMemo(() => buildTrendPoints(score), [score]);
  const trendPath = useMemo(() => buildTrendPath(trendPoints, 320, 108), [trendPoints]);
  const trendAreaPath = `${trendPath} L 320 108 L 0 108 Z`;
  const trendLabel = useMemo(() => describeTrend(trendPoints), [trendPoints]);
  const vnChange = snapshot?.vnIndex?.changePct ?? 0;
  const arcFill = useMemo(() => {
    const radius = 102;
    const circumference = Math.PI * radius;
    return `${(score / 100) * circumference} ${circumference}`;
  }, [score]);

  return (
    <motion.div
      variants={fadeIn}
      className="glass-card relative overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(24,28,39,0.96),rgba(12,15,23,0.96))] p-4 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tracking-tight text-white">
            Nhiệt kế thị trường
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
            Live
          </span>
          <span className="rounded border border-[#f0cf7a]/20 bg-[#f0cf7a]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f6dda0]">
            VN
          </span>
        </div>
        <Link
          href="/dashboard/sentiment"
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-[#f6dda0]"
        >
          Chi tiết <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Body: left=compact gauge+sparkline | right=metric bars */}
      <div className="flex gap-4">
        {/* Left: mini gauge + trend sparkline stacked */}
        <div className="flex w-44 flex-shrink-0 flex-col items-center">
          {/* Compact arc gauge */}
          <svg viewBox="0 0 160 100" className="w-full overflow-visible">
            {ZONES.map((z, i) => {
              const radius = 72;
              const c = Math.PI * radius;
              const isActive = score >= z.min && (score < z.max || (z.max > 100 && score <= 100));
              const offset = (z.min / 100) * c;
              const spanLength = ((z.max - z.min) / 100) * c;
              const dashLength = Math.max(0, spanLength - 4);
              return (
                <circle
                  key={i}
                  cx="80" cy="90" r={radius}
                  fill="none"
                  stroke={z.color}
                  strokeWidth={isActive ? 14 : 8}
                  strokeLinecap="round"
                  strokeDasharray={`${dashLength} ${c}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-180 80 90)"
                  opacity={isActive ? 1 : 0.22}
                  style={{
                    transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    filter: isActive ? `drop-shadow(0 0 8px ${z.color}50)` : "none"
                  }}
                />
              );
            })}

            {/* Needle marker */}
            {(() => {
              const radius = 72;
              const angle = Math.PI - (score / 100) * Math.PI;
              const mx = 80 + Math.cos(angle) * radius;
              const my = 90 - Math.sin(angle) * radius;
              return (
                <g style={{
                  transform: `translate(${mx}px, ${my}px)`,
                  transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
                }}>
                  <circle r={10} fill="#0F1120" stroke={zone.glow} strokeWidth={4} />
                  <circle r={4} fill="white" />
                </g>
              );
            })()}
          </svg>

          {/* Score in arc */}
          <div className="relative -mt-14 flex flex-col items-center">
            <span className="text-[44px] font-black leading-none tracking-tighter text-white">{score}</span>
            <span
              className="mt-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest backdrop-blur"
              style={{ color: zone.color }}
            >
              {zone.label}
            </span>
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">
              {trendLabel}
            </span>
          </div>

          {/* Sparkline */}
          <svg viewBox="0 0 176 44" className="mt-2 w-full overflow-visible">
            <defs>
              <linearGradient id={`sg-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={zone.color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={zone.color} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d={(() => {
                const pts = trendPoints;
                const w = 176, h = 44;
                const stepX = w / (pts.length - 1);
                return pts.map((p, i) => {
                  const x = i * stepX;
                  const y = h - ((p - 20) / 66) * (h - 6) - 3;
                  return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }).join(" ");
              })()}
              fill="none"
              stroke={`url(#sg-${score})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Right: 5 metric bars */}
        <div className="flex flex-1 flex-col justify-around gap-2">
          {indicators.map((indicator, index) => {
            const barColor = getIndicatorColor(indicator.tone, zone.color);
            return (
              <div key={indicator.label} className="flex items-center gap-2.5">
                <span className="w-20 flex-shrink-0 text-[11px] text-white/50 font-medium">{indicator.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${indicator.value}%` }}
                    transition={{ duration: 0.8, delay: index * 0.06 }}
                    className="h-full rounded-full"
                    style={{ background: barColor }}
                  />
                </div>
                <span className="w-6 flex-shrink-0 text-right text-[11px] font-semibold text-white/70">
                  {indicator.value}
                </span>
              </div>
            );
          })}

          {/* Vẹt Vàng quote — inline compact */}
          <div className="mt-1 flex items-start gap-2 rounded-xl border border-[#f0cf7a]/15 bg-[#f0cf7a]/5 p-2.5">
            <span className="flex-shrink-0 text-sm">🦜</span>
            <div>
              <p className="text-[11px] leading-relaxed text-white/65 italic">"{quote}"</p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#f6dda0]">→ {action}</p>
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
