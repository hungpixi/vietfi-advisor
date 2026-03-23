"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, TrendingDown, Activity, ArrowUpRight } from "lucide-react";
import type { MarketSnapshot } from "@/lib/market-data/crawler";
import { getMarketCache, setMarketCache } from "@/lib/storage";
import { cn } from "@/lib/utils";

/* ─── Shared types ─────────────────────────────────────────── */

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

/* ─── F&G helpers ──────────────────────────────────────────── */

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
  return Math.round(Math.max(0, Math.min(100, 50 + vn * 1.5 - gold * 1.2)));
}

/* ─── Card builder ──────────────────────────────────────────── */

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
          (
            ((fx.rate - prevSnapshot.usdVnd.rate) /
              prevSnapshot.usdVnd.rate) *
            100
          ).toFixed(2),
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
      icon: fx
        ? usdChange >= 0
          ? TrendingUp
          : TrendingDown
        : TrendingDown,
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

/* ─── Framer Motion variants ───────────────────────────────── */

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── MarketCard ────────────────────────────────────────────── */

export function MarketCard({ label, value, change, icon: Icon }: MarketCardData) {
  const positive = change >= 0;
  return (
    <motion.div
      variants={fadeIn}
      className="glass-card glass-card-hover p-4 transition-all cursor-default"
      data-testid="market-card"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/30">
          {label}
        </span>
        <Icon
          className={cn(
            "w-3.5 h-3.5",
            positive ? "text-[#22C55E]" : "text-[#EF4444]",
          )}
        />
      </div>
      <div className="text-xl font-bold text-white tracking-tight">{value}</div>
      <span
        className={cn(
          "text-xs font-medium",
          positive ? "text-[#22C55E]" : "text-[#EF4444]",
        )}
      >
        {positive ? "+" : ""}
        {change}%
      </span>
    </motion.div>
  );
}

/* ─── MarketSkeletonCard ───────────────────────────────────── */

export function MarketSkeletonCard() {
  return (
    <div data-testid="market-skeleton" className="glass-card p-4 animate-pulse">
      <div className="h-4 bg-white/[0.1] rounded mb-3" />
      <div className="h-8 bg-white/[0.1] rounded mb-2" />
      <div className="h-3 bg-white/[0.1] rounded w-3/4" />
    </div>
  );
}

/* ─── FGGauge ──────────────────────────────────────────────── */

export function FGGauge({ score }: { score: number }) {
  const fgLabel = getFgLabel(score);
  const fgColor = getFgColor(score);
  const angle = -90 + (score / 100) * 180;

  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: fgColor }} />
          <h3 className="text-sm font-semibold text-white">
            Nhiệt kế thị trường
          </h3>
        </div>
        <Link
          href="/dashboard/sentiment"
          className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider"
        >
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
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeG)"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.2"
            />
            {/* Foreground arc (progress) */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeG)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 251} 251`}
            />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2={100 + 55 * Math.cos((angle * Math.PI) / 180)}
              y2={100 + 55 * Math.sin((angle * Math.PI) / 180)}
              stroke={fgColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Center dot */}
            <circle cx="100" cy="100" r="4" fill={fgColor} />
          </svg>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <div className="text-3xl font-black" style={{ color: fgColor }}>
              {score}
            </div>
          </div>
        </div>
      </div>
      <div className="text-center mt-1">
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            color: fgColor,
            backgroundColor: `${fgColor}12`,
          }}
        >
          {fgLabel}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── MarketSection orchestrator ────────────────────────────── */

export function MarketSection({
  onError,
}: {
  onError?: (e: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [prevSnapshot, setPrevSnapshot] = useState<MarketSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async (isRetry = false) => {
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
      // Cache to localStorage via storage.ts helpers
      setMarketCache(data);
    } catch (err: unknown) {
      // Try localStorage fallback
      const cached = getMarketCache();
      if (cached) {
        setSnapshot((prev) => prev || cached);
      }
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      setError(msg);
      onError?.(msg);
      // Auto-retry after 30s if first attempt
      if (!isRetry) {
        setTimeout(() => fetchMarketData(true), 30000);
      }
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Init: run once on mount
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!snapshot) return;
    const timer = setInterval(() => {
      fetchMarketData();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [snapshot, fetchMarketData]);

  // Market volatility alert — check changePct thresholds
  useEffect(() => {
    if (!snapshot || typeof window === "undefined") return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const alertedKey = `vietfi_alerted_${new Date().toDateString()}`;
    if (sessionStorage.getItem(alertedKey)) return;

    const alerts: string[] = [];
    const vnPct = snapshot.vnIndex?.changePct ?? 0;
    const goldPct = snapshot.goldSjc?.changePct ?? 0;

    if (Math.abs(vnPct) >= 2)
      alerts.push(`VN-Index ${vnPct > 0 ? "+" : ""}${vnPct.toFixed(1)}%`);
    if (Math.abs(goldPct) >= 3)
      alerts.push(`Vàng ${goldPct > 0 ? "+" : ""}${goldPct.toFixed(1)}%`);

    if (alerts.length > 0) {
      sessionStorage.setItem(alertedKey, "1");
      new Notification("⚠️ VietFi — Biến động mạnh!", {
        body: alerts.join(" | ") + "\nMở dashboard để xem chi tiết.",
        icon: "/assets/icon-192.png",
        tag: "market-volatility",
      });
    }
  }, [snapshot]);

  const cards = buildMarketCards(snapshot, prevSnapshot);
  const fgScore = calculateFgScore(snapshot);

  return (
    <motion.div variants={stagger} className="space-y-3">
      {/* Error banner */}
      {error && (
        <div className="glass-card p-3 text-sm text-red-300">
          Lỗi lấy dữ liệu thị trường: {error}
        </div>
      )}

      {/* 4 Market cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <MarketSkeletonCard key={idx} />
          ))}
        </div>
      ) : (
        <motion.div
          variants={stagger}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {cards.map((card) => (
            <MarketCard key={card.label} {...card} />
          ))}
        </motion.div>
      )}

      {/* F&G Gauge */}
      <FGGauge score={fgScore} />
    </motion.div>
  );
}
