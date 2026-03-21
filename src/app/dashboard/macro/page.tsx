"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Minus,
  Globe, Sparkles, AlertCircle, RefreshCw, Clock,
} from 'lucide-react';
import type { MarketSnapshot } from '@/lib/market-data/crawler';

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmtVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function fmtVnIndex(price: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
}

function fmtPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function fmtGold(vnd: number): string {
  const tr = vnd / 1_000_000;
  return `${tr.toFixed(1)} tr`;
}

function fmtChangePct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function fmtTrend(pct: number | null | undefined): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return 'N/A';
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      data-testid="macro-skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="glass-card p-5 animate-pulse"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded bg-white/5" />
        <div className="w-4 h-4 rounded bg-white/5" />
      </div>
      <div className="w-24 h-8 rounded bg-white/5 mb-2" />
      <div className="w-16 h-4 rounded bg-white/5" />
    </motion.div>
  );
}

// ── Indicator card ─────────────────────────────────────────────────────────

function IndicatorCard({
  emoji,
  label,
  value,
  sub,
  note,
  trend,
  delay = 0,
}: {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
  note?: string;
  trend: 'up' | 'down' | 'neutral';
  delay?: number;
}) {
  const color = trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : '#8B8D96';
  const TIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card glass-card-hover p-5 transition-all cursor-default"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{emoji}</span>
        <TIcon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-white/60">{label}</span>
        {trend !== 'neutral' && (
          <span className="text-[10px] font-medium" style={{ color }}>
            {trend === 'up' ? '+' : ''}{sub ?? ''}
          </span>
        )}
      </div>
      {note ? (
        <div className="text-[10px] text-white/50 mt-1">
          {note}
        </div>
      ) : null}
    </motion.div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-testid="macro-error"
      className="glass-card p-6 text-center flex flex-col items-center gap-3"
    >
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-white/60">Không lấy được dữ liệu thị trường</p>
      <p className="text-xs text-white/30">Có thể do mạng hoặc nguồn dữ liệu tạm thời ngoại tuyến</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 text-xs text-[#E6B84F] hover:text-[#f0c84f] transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Thử lại
      </button>
    </div>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.03] text-white/25 border border-white/[0.05]">
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

type FetchState = 'idle' | 'loading' | 'success' | 'error';

export default function MacroPage() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    setFetchState('loading');
    setFetchError(null);
    try {
      const resp = await fetch('/api/market-data')
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data: MarketSnapshot = await resp.json()
      setSnapshot(data)
      setFetchState('success')
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unknown error')
      setFetchState('error')
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (fetchState !== 'success') return;
    const id = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchState]);

  const isLoading = fetchState === 'idle' || fetchState === 'loading';

  // AI commentary derived from API/Ai data 
  const commentary = snapshot?.aiSummary || (() => {
    if (!snapshot) return null;
    const lines: string[] = [];
    if (snapshot.vnIndex) {
      lines.push(`VN-Index ${fmtVnIndex(snapshot.vnIndex.price)} (${fmtTrend(snapshot.vnIndex.changePct)})`);
    }
    if (snapshot.goldSjc) {
      lines.push(`Vàng SJC ${fmtGold(snapshot.goldSjc.goldVnd)}/lượng (${fmtTrend(snapshot.goldSjc.changePct)})`);
    }
    if (snapshot.usdVnd) {
      lines.push(`USD/VND ${fmtVnd(Math.round(snapshot.usdVnd.rate))}`);
    }
    const gdp = snapshot.macro.gdpYoY.find((it) => it.period === '2025')?.value;
    const cpi = snapshot.macro.cpiYoY.find((it) => it.period === '2025')?.value;
    if (gdp !== undefined) lines.push(`GDP YoY 2025 ${fmtPercent(gdp)}`);
    if (cpi !== undefined) lines.push(`CPI YoY 2025 ${fmtPercent(cpi)}`);
    return lines.join(' ');
  })();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">
          Xu hướng <span className="text-gradient">kinh tế</span>
        </h1>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-white/25" />
          <p className="text-[13px] text-white/40">
            {snapshot
              ? `Cập nhật: ${new Date(snapshot.fetchedAt).toLocaleTimeString('vi-VN')}`
              : 'Đang tải dữ liệu...'}
          </p>
          {snapshot && (
            <SourceBadge label={snapshot.vnIndex?.source ?? snapshot.goldSjc?.source ?? 'live'} />
          )}
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <SkeletonCard delay={0} />
          <SkeletonCard delay={0.05} />
          <SkeletonCard delay={0.1} />
        </div>
      )}

      {/* Error state */}
      {fetchState === 'error' && (
        <ErrorState onRetry={fetchData} />
      )}

      {/* Live data */}
      {fetchState === 'success' && snapshot && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {/* VN-Index */}
            {snapshot.vnIndex ? (
              <IndicatorCard
                emoji="📊"
                label="VN-Index"
                value={fmtVnIndex(snapshot.vnIndex.price)}
                sub={fmtChangePct(snapshot.vnIndex.changePct)}
                trend={snapshot.vnIndex.changePct > 0 ? 'up' : snapshot.vnIndex.changePct < 0 ? 'down' : 'neutral'}
                delay={0}
              />
            ) : (
              <div data-testid="macro-error" className="glass-card p-5 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-white/30" />
                <span className="text-sm text-white/40">VN-Index: không có dữ liệu</span>
              </div>
            )}

            {/* Gold SJC */}
            {snapshot.goldSjc ? (
              <IndicatorCard
                emoji="🪙"
                label="Vàng SJC"
                value={`${fmtGold(snapshot.goldSjc.goldVnd)}/lượng`}
                sub={fmtChangePct(snapshot.goldSjc.changePct)}
                trend={
                  snapshot.goldSjc.changePct > 0 ? 'up' :
                  snapshot.goldSjc.changePct < 0 ? 'down' : 'neutral'
                }
                delay={0.05}
              />
            ) : (
              <div data-testid="macro-error" className="glass-card p-5 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-white/30" />
                <span className="text-sm text-white/40">Vàng SJC: không có dữ liệu</span>
              </div>
            )}

            {/* USD/VND */}
            {snapshot.usdVnd ? (
              <IndicatorCard
                emoji="💵"
                label="USD/VND"
                value={fmtVnd(Math.round(snapshot.usdVnd.rate))}
                trend="neutral"
                note="Tỷ giá tham khảo; mỗi nơi mỗi khác"
                delay={0.1}
              />
            ) : (
              <div data-testid="macro-error" className="glass-card p-5 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-white/30" />
                <span className="text-sm text-white/40">USD/VND: không có dữ liệu</span>
              </div>
            )}
          </div>

          {/* Macro data cards (GDP, CPI, Lãi suất) */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <IndicatorCard
              emoji="📈"
              label="GDP YoY 2025"
              value={snapshot.macro ? fmtPercent(snapshot.macro.gdpYoY[0]?.value ?? 0) : '--'}
              trend="up"
              delay={0}
            />
            <IndicatorCard
              emoji="⚖️"
              label="CPI YoY 2025"
              value={snapshot.macro ? fmtPercent(snapshot.macro.cpiYoY[0]?.value ?? 0) : '--'}
              trend="neutral"
              delay={0.05}
            />
            <IndicatorCard
              emoji="🏦"
              label="Lãi suất 12T"
              value={snapshot.macro ? `${snapshot.macro.deposit12m.min.toFixed(1)}% - ${snapshot.macro.deposit12m.max.toFixed(1)}%` : '--'}
              trend="neutral"
              delay={0.1}
            />
          </div>

          {/* Trend summary current / biến động */}
          <div className="glass-card p-4 mb-6">
            <h3 className="text-xs text-white/70 uppercase tracking-widest mb-2">Biến động trend</h3>
            <div className="flex flex-wrap gap-3 text-[12px] text-white/80">
              <span>VN-Index: {snapshot.vnIndex ? fmtTrend(snapshot.vnIndex.changePct) : 'N/A'}</span>
              <span>Vàng SJC: {snapshot.goldSjc ? fmtTrend(snapshot.goldSjc.changePct) : 'N/A'}</span>
              <span>USD/VND: --</span>
            </div>
          </div>

          {/* AI Commentary */}
          {commentary && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5 border-[#E6B84F]/10 relative overflow-hidden"
            >
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#E6B84F]" />
                  <h2 className="text-sm font-semibold text-white">Tóm tắt thị trường</h2>
                </div>
                <p className="text-[13px] text-white/50 leading-relaxed mb-3">{commentary}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Globe className="w-3 h-3 text-white/20" />
                  <SourceBadge label={snapshot.vnIndex?.source ?? 'cafef.vn'} />
                  <SourceBadge label={snapshot.goldSjc?.source ?? 'Yahoo Finance'} />
                  <SourceBadge label={snapshot.usdVnd?.source ?? 'SBV'} />
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
