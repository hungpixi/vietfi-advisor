"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowUpRight, Sparkles } from "lucide-react";
import type { MarketSnapshot } from "@/lib/market-data/crawler";
import { getMarketCache, setMarketCache } from "@/lib/storage";
import { cn } from "@/lib/utils";

function usePersistentTime() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => setTime(
      new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    updateTime();
    const id = setInterval(updateTime, 60_000);

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

const SENTIMENT_GAUGE_THEME = {
  arcBase: "#31384B",
  arcFill: "#F4B437",
  arcGlow: "rgba(244, 180, 55, 0.55)",
  needle: "#E5E7EB",
  needleShadow: "rgba(0, 0, 0, 0.6)",
  pivotOuter: "#D9C6A4",
  pivotInner: "#BFA06D",
};

export function MarketCard({ label, value, change, icon: Icon }: MarketCardData) {
  const positive = change >= 0;
  const color = positive ? "#22C55E" : "#EF4444";

  return (
    <motion.div
      variants={fadeIn}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/10 bg-[#08110f] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 cursor-default",
        positive ? "hover:border-[#22C55E]/40" : "hover:border-[#EF4444]/40"
      )}
      data-testid="market-card"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
      <div className={cn("pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-700 group-hover:opacity-100", positive ? "bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.12),transparent_46%)]" : "bg-[radial-gradient(circle_at_50%_35%,rgba(239,68,68,0.12),transparent_46%)]")} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Decors */}
      <div className="absolute top-0 left-0 w-24 h-24 blur-[40px] pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ backgroundColor: color }} />
      <div className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-white/20" />
      <div className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-white/10" />

      <div className="mb-1.5 flex items-center justify-between relative z-10 border-b border-white/[0.06] pb-1.5">
        <span className="font-heading text-[12px] font-black uppercase tracking-wide text-white/90 transition-colors">
          {label}
        </span>
        <div className={cn("p-1.5 rounded-lg border", positive ? "bg-[#22C55E]/10 border-[#22C55E]/20" : "bg-[#EF4444]/10 border-[#EF4444]/20")}>
          <Icon
            className={cn("h-3.5 w-3.5", positive ? "text-[#22C55E]" : "text-[#EF4444]")}
          />
        </div>
      </div>

      <div className="relative z-10 pt-0.5">
        <div className="font-heading text-[20px] tracking-wider font-black text-white mb-2 group-hover:translate-x-1 transition-transform duration-300 drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)]">{value}</div>
        <div className="flex items-center gap-2">
          <span
            className={cn("font-mono text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border", positive ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30" : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30")}
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
  const indicators = buildIndicatorMetrics(score, snapshot);

  return (
    <motion.div
      variants={fadeIn}
      className="group relative h-full overflow-hidden rounded-xl border border-white/10 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-white/20 md:p-8 flex flex-col"
    >
      {/* Cyber-Technical Background Elements */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.03),transparent_46%)] opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Cyber Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none opacity-20" style={{ backgroundColor: zone.color }} />
      <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-white/30" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-white/20" />

      {/* Header */}
      <div className="relative z-10 mb-6 border-b border-white/[0.06] pb-6">
        <div className="relative flex flex-col items-start px-2 sm:px-6 pt-2">
          <div className="w-full text-left">
            <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px]">
              TÂM LÝ THỊ TRƯỜNG
            </h3>
            <p className="mt-4 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
              NHIỆT KẾ THỊ TRƯỜNG
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 relative z-10 w-full h-full pb-4">
        {/* Top: market sentiment gauge (styled to match reference) */}
        <div className="relative flex w-full flex-col items-center justify-center pt-2">
          <svg viewBox="0 0 180 124" className="w-full max-w-[280px] overflow-visible">
            {/* Base track */}
            <path
              d="M 26 94 A 64 64 0 0 1 154 94"
              fill="none"
              stroke={SENTIMENT_GAUGE_THEME.arcBase}
              strokeWidth="11"
              strokeLinecap="round"
            />

            {/* Filled track */}
            <path
              d="M 26 94 A 64 64 0 0 1 154 94"
              fill="none"
              stroke={SENTIMENT_GAUGE_THEME.arcFill}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={(Math.PI * 64).toFixed(5)}
              strokeDashoffset={(Math.PI * 64 - ((score / 100) * Math.PI * 64)).toFixed(5)}
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 8px ${SENTIMENT_GAUGE_THEME.arcGlow})` }}
            />

            {/* Needle */}
            <g
              style={{
                transformOrigin: "90px 94px",
                transform: `rotate(${(score / 100) * 180 - 90}deg)`,
                transition: "transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <line
                x1="90"
                y1="94"
                x2="90"
                y2="28"
                stroke={SENTIMENT_GAUGE_THEME.needle}
                strokeWidth="2.8"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 2px 4px ${SENTIMENT_GAUGE_THEME.needleShadow})` }}
              />
            </g>

            {/* Pivot */}
            <circle cx="90" cy="94" r="7.2" fill={SENTIMENT_GAUGE_THEME.pivotOuter} />
            <circle cx="90" cy="94" r="3.4" fill={SENTIMENT_GAUGE_THEME.pivotInner} />
          </svg>

          <div className="-mt-2 flex flex-col items-center">
            <span
              className="text-[46px] font-black leading-none tracking-tight"
              style={{
                color: SENTIMENT_GAUGE_THEME.arcFill,
                textShadow: "0 0 10px rgba(244,180,55,0.4)",
              }}
            >
              {score}
            </span>
            <span
              className="mt-1 text-[17px] font-black uppercase tracking-wide font-mono"
              style={{ color: "#E2A838" }}
            >
              {zone.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bottom: Metric bars and Professional Insight Box */}
        <div className="flex-1 flex flex-col space-y-5 relative z-10 w-full mt-4">
          {indicators.map((indicator, index) => {
            const barColor = getIndicatorColor(indicator.value);
            return (
              <div key={indicator.label} className="group/bar">
                <div className="mb-1">
                  <span className="font-heading text-[15px] font-black tracking-wide text-white/90">{indicator.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-1.5 w-full bg-[#1F222A] rounded-full overflow-hidden border border-white/[0.02]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${indicator.value}%` }}
                      transition={{ duration: 1.2, delay: index * 0.1, ease: "circOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor, boxShadow: `0 0 10px ${barColor}40` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/60 w-8 text-right shrink-0">{indicator.value}</span>
                </div>
              </div>
            );
          })}

          {/* Professional Insight Box */}
          <div className="mt-4 relative p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            <div className="flex gap-3 items-start relative z-10">
              <div className="flex-shrink-0 mt-0.5 rounded-full w-4 h-4 border border-white/30 flex items-center justify-center font-mono text-[9px] text-white/50">
                i
              </div>
              <p className="text-[13px] font-medium text-white/60 leading-relaxed font-sans">
                <span className="text-white/80 font-semibold mr-1">AI Commentary:</span>
                {quote} {action}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function MarketSection({
  onError,
  briefElement,
  pinnedElement,
}: {
  onError?: (e: string) => void;
  briefElement?: ReactNode;
  pinnedElement?: ReactNode;
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
        <div className="grid lg:grid-cols-12 gap-4">
          {pinnedElement && (
            <div className="lg:col-span-8 h-full">
              {pinnedElement}
            </div>
          )}
          <div className={cn("grid grid-cols-2 gap-3", pinnedElement ? "lg:col-span-4" : "lg:grid-cols-4 lg:col-span-12")}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <MarketSkeletonCard key={idx} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-4">
          {pinnedElement && (
            <div className="lg:col-span-8 h-full">
              {pinnedElement}
            </div>
          )}
          <motion.div
            variants={stagger}
            className={cn("grid grid-cols-2 gap-3", pinnedElement ? "lg:col-span-4" : "lg:grid-cols-4 lg:col-span-12")}
          >
            {cards.map((card) => (
              <MarketCard key={card.label} {...card} />
            ))}
          </motion.div>
        </div>
      )}

      <div className={cn("mt-4", briefElement ? "grid lg:grid-cols-3 gap-4" : "")}>
        <div className={cn("h-full", briefElement ? "lg:col-span-1" : "")}>
          <FGGauge score={fgScore} snapshot={snapshot} />
        </div>
        {briefElement && (
          <div className="lg:col-span-2 h-full flex flex-col w-full min-w-0">
            {briefElement}
          </div>
        )}
      </div>
    </motion.div>
  );
}
