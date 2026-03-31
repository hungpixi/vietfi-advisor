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
  history: number[];
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

  const generateMockHistory = (finalValue: number, volatility: number) => {
    return Array.from({ length: 12 }, (_, i) => {
      const step = i / 11; // 0 to 1
      const noise = (Math.random() - 0.5) * volatility;
      const trend = (finalValue - 20) * step + 15; // move from around 15 to finalValue
      return Math.max(5, Math.min(95, trend + noise));
    });
  };

  return [
    {
      label: "Đà giá",
      value: clampMetric(score + vnChange * 10),
      tone: score >= 58 ? "greed" : score <= 42 ? "fear" : "neutral",
      history: generateMockHistory(clampMetric(score + vnChange * 10), 10),
    },
    {
      label: "Tin tức",
      value: clampMetric(score + vnChange * 7 - goldChange * 5 + 4),
      tone: score >= 55 ? "greed" : score <= 40 ? "fear" : "neutral",
      history: generateMockHistory(clampMetric(score + vnChange * 7 - goldChange * 5 + 4), 15),
    },
    {
      label: "Độ rộng",
      value: clampMetric(score + vnChange * 14 + btcChange * 2),
      tone: score >= 52 ? "greed" : score <= 38 ? "fear" : "neutral",
      history: generateMockHistory(clampMetric(score + vnChange * 14 + btcChange * 2), 8),
    },
    {
      label: "Vàng",
      value: clampMetric(50 - goldChange * 14 + score * 0.18),
      tone: goldChange > 0.8 ? "fear" : goldChange < -0.4 ? "greed" : "neutral",
      history: generateMockHistory(clampMetric(50 - goldChange * 14 + score * 0.18), 12),
    },
    {
      label: "Khối ngoại ròng",
      value: clampMetric(score + vnChange * 8 - fxPressure),
      tone: score >= 57 ? "greed" : score <= 44 ? "fear" : "neutral",
      history: generateMockHistory(clampMetric(score + vnChange * 8 - fxPressure), 5),
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
      className="glass-card relative overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(24,28,39,0.96),rgba(12,15,23,0.96))] p-4 shadow-xl md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:58px_58px]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-white/5" />

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black tracking-tight text-white md:text-2xl">
              Nhiệt kế thị trường
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]" />
              Live
            </span>
            <span className="rounded-lg border border-[#f0cf7a]/20 bg-[#f0cf7a]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f6dda0]">
              VN
            </span>
          </div>

          <Link
            href="/dashboard/sentiment"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-[#f6dda0]"
          >
            Xem chi tiết <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="relative mx-auto w-full max-w-[280px]">
            <div className="absolute inset-[15%_10%_25%] rounded-full bg-[radial-gradient(circle,_rgba(250,220,130,0.25),_transparent_65%)] blur-2xl" />
            <div className="absolute inset-[24%_16%_14%] rounded-full bg-[radial-gradient(circle,_rgba(50,220,140,0.15),_transparent_62%)] blur-2xl" />

            <svg viewBox="0 0 320 200" className="relative z-10 w-full overflow-visible">
              {ZONES.map((z, i) => {
                const radius = 106;
                const c = 2 * Math.PI * radius;
                const half = c / 2;
                const isActive = score >= z.min && (score < z.max || (z.max > 100 && score <= 100));

                // Sweep calculation
                const offset = (z.min / 100) * half;
                const spanLength = ((z.max - z.min) / 100) * half;
                const gap = 12; // pixels
                const dashLength = Math.max(0, spanLength - gap);

                return (
                  <circle
                    key={i}
                    cx="160"
                    cy="182"
                    r={radius}
                    fill="none"
                    stroke={z.color}
                    strokeWidth={isActive ? 22 : 12}
                    strokeLinecap="round"
                    strokeDasharray={`${dashLength} ${c}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-180 160 182)"
                    opacity={isActive ? 1 : 0.25}
                    style={{
                      transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      filter: isActive ? `drop-shadow(0 0 12px ${z.color}40)` : "none"
                    }}
                  />
                );
              })}

              {/* TÍNH TOÁN VỊ TRÍ MARKER */}
              {(() => {
                const radius = 106;
                const angle = Math.PI - (score / 100) * Math.PI;
                const markerX = 160 + Math.cos(angle) * radius;
                const markerY = 182 - Math.sin(angle) * radius;

                return (
                  <g
                    style={{
                      transform: `translate(${markerX}px, ${markerY}px)`,
                      transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    }}
                  >
                    <circle r={14} fill="#181C27" stroke={zone.glow} strokeWidth={6} />
                    <circle r={5} fill="white" />
                  </g>
                );
              })()}
            </svg>

            <div
              className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center"
              style={{ top: '135px', left: '50%' }}
            >
              <div className="text-[60px] font-black leading-none tracking-tighter text-white drop-shadow-md">
                {score}
              </div>
            </div>

            <div
              className="pointer-events-none absolute z-20 flex -translate-x-1/2 items-center justify-center text-center"
              style={{ top: '167px', left: '50%' }}
            >
              <div
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-md"
                style={{ color: zone.color }}
              >
                {zone.label}
              </div>
            </div>

            <div
              className="pointer-events-none absolute z-20 flex -translate-x-1/2 items-center justify-center text-center"
              style={{ top: '200px', left: '50%' }}
            >
              <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/35">
                {trendLabel}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-2">
              {indicators.map((indicator, index) => {
                const barColor = getIndicatorColor(indicator.tone, zone.color);
                // Create a mini sparkline path
                const stepX = 140 / (indicator.history.length - 1);
                const sparkPath = indicator.history.map((h, i) => {
                  const x = i * stepX;
                  const y = 30 - (h / 100) * 26;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                }).join(" ");

                return (
                  <div key={indicator.label} className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:bg-white/[0.04]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/50 group-hover:text-white/80 transition-colors">
                        {indicator.label}
                      </span>
                      <span className="text-lg font-black text-white" style={{ textShadow: `0 0 10px ${barColor}40` }}>
                        {indicator.value}
                      </span>
                    </div>
                    
                    <div className="flex h-8 items-end justify-between gap-4">
                      <svg viewBox="0 0 140 32" className="flex-1 overflow-visible">
                        <motion.path
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 1.5, delay: index * 0.1 }}
                          d={sparkPath}
                          fill="none"
                          stroke={barColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="140" cy={30 - (indicator.value / 100) * 26} r="2" fill={barColor} />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative flex flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-sm transition-all hover:bg-white/[0.05]">
            <div className="pointer-events-none absolute inset-0 bg-white/[0.01]" />
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0cf7a]/15 text-lg shadow-[inset_0_0_10px_rgba(240,207,122,0.1)]">
                🦜
              </div>
              <div>
                <div className="text-base font-bold text-white">Vẹt Vàng</div>
                <div className="text-[11px] text-white/35 font-mono" suppressHydrationWarning>
                  {localTime ? localTime : "Đang lắng nghe"}
                </div>
              </div>
            </div>
            <p className="relative z-10 mt-4 text-[15px] leading-relaxed text-white/80">
              {quote}
            </p>
            <div className="relative z-10 mt-auto pt-4 text-sm font-semibold text-[#f6dda0]">
              → {action}
            </div>
          </div>

          <div className="relative flex flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-sm transition-all hover:bg-white/[0.05]">
            <div className="mb-4">
              <div className="text-lg font-black text-[#f6dda0] uppercase tracking-wider">Xu hướng 24h</div>
              <div className="mt-0.5 text-[11px] text-white/40">
                {trendLabel} • nhịp tâm lý
              </div>
            </div>

            <div className="relative flex-1 flex items-center justify-center">
              <svg viewBox="0 0 320 108" className="h-[74px] w-full overflow-visible">
                <defs>
                  <linearGradient id="trendStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3de28b" stopOpacity="0.72" />
                    <stop offset="100%" stopColor="#63f0ae" stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id="trendFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38d996" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#38d996" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                <path d={trendAreaPath} fill="url(#trendFill)" />
                <path
                  d={trendPath}
                  fill="none"
                  stroke="url(#trendStroke)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {trendPoints.map((_, index) => {
                  const x = (320 / Math.max(trendPoints.length - 1, 1)) * index;

                  return (
                    <line
                      key={x}
                      x1={x}
                      y1="92"
                      x2={x}
                      y2="101"
                      stroke="rgba(255,255,255,0.28)"
                      strokeWidth={index % 2 === 0 ? 1.8 : 1}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="mt-4 flex items-center justify-between text-[10px] text-white/30 font-mono">
              <span>9h</span>
              <span>12h</span>
              <span>15h</span>
              <span>Đóng</span>
            </div>
          </div>

          <div className="relative flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-sm transition-all hover:bg-white/[0.05]">
            <div className="flex-1 rounded-xl bg-white/[0.04] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
                Tình trạng
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xl font-black text-white">{zone.label}</div>
                  <div className="mt-0.5 text-[11px] text-white/45">
                    VN-Index{" "}
                    {snapshot?.vnIndex
                      ? `${vnChange > 0 ? "+" : ""}${vnChange.toFixed(2)}%`
                      : "đang đồng pha"}
                  </div>
                </div>
                <div
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ color: zone.color, backgroundColor: `${zone.color}18` }}
                >
                  {score}/100
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-xl bg-white/[0.04] p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
                Vẹt chốt nhanh
              </div>
              <div className="text-[13px] leading-relaxed text-white/70 italic">
                "{action}"
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
