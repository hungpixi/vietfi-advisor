"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GURU_PERSONAS, type GuruPersona } from "@/lib/guru-personas";
import { getGuruStrategy } from "@/lib/market-data/guru-strategies";
import { spendXP, getGamification, addXP } from "@/lib/gamification";
import {
  Lock, Unlock, ArrowLeft, Coffee, FlaskConical,
  TrendingUp, TrendingDown, AlertTriangle, BarChart3, Percent
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { BacktestResult, BacktestMetrics, EquityPoint } from "@/lib/market-data/backtest-engine";

/* ─── Helpers ─── */
function fmtCurrency(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} tr`;
  return n.toLocaleString("vi-VN");
}
function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function MetricBadge({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 text-center">
      <p className="text-[10px] text-white/30 uppercase tracking-wider font-mono mb-0.5">{label}</p>
      <p className={cn("text-base font-black font-mono", positive === true ? "text-emerald-400" : positive === false ? "text-red-400" : "text-white")}>
        {value}
      </p>
    </div>
  );
}

/* ─── Main ─── */
export default function GuruDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [guru, setGuru] = useState<GuruPersona | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userXp, setUserXp] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Backtest preview data
  const [btLoading, setBtLoading] = useState(false);
  const [btResult, setBtResult] = useState<(BacktestResult & { strategyLabel?: string }) | null>(null);
  const [btError, setBtError] = useState("");

  useEffect(() => {
    if (id && GURU_PERSONAS[id]) setGuru(GURU_PERSONAS[id]);
    const state = getGamification();
    setUserXp(state.xp);
    const unlockedList = JSON.parse(localStorage.getItem("vf_unlocked_gurus") || "[]");
    const today = new Date().toISOString().slice(0, 10);
    if (unlockedList.includes(`${id}_${today}`)) setIsUnlocked(true);
  }, [id]);

  // Fetch real backtest preview sau khi unlock
  const fetchBacktestPreview = useCallback(async () => {
    const gs = getGuruStrategy(id);
    if (!gs) return;
    setBtLoading(true);
    setBtError("");
    try {
      const toDate = new Date().toISOString().slice(0, 10);
      const fromDate = `${new Date().getFullYear() - 3}-01-01`;
      const resp = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: gs.sampleTicker,
          fromDate,
          toDate,
          guru: id,
          capital: 100_000_000,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) { setBtError(json.error ?? "Lỗi fetch data"); return; }
      setBtResult({ ...json, strategyLabel: gs.strategyLabel });
    } catch {
      setBtError("Không thể kết nối API");
    } finally {
      setBtLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isUnlocked) fetchBacktestPreview();
  }, [isUnlocked, fetchBacktestPreview]);

  const handleUnlock = () => {
    const cost = 300;
    if (spendXP(cost)) {
      setIsUnlocked(true);
      setUserXp((prev) => prev - cost);
      // Award XP for exploration
      addXP("read_knowledge");
      const unlockedList = JSON.parse(localStorage.getItem("vf_unlocked_gurus") || "[]");
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("vf_unlocked_gurus", JSON.stringify([...unlockedList, `${id}_${today}`]));
    } else {
      setErrorMsg("Thật tiếc, bạn chưa đủ Cà Phê! Hãy ghi chép chi tiêu để kiếm XP.");
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const handleGoBacktest = () => {
    router.push(`/dashboard/backtest?guru=${id}`);
  };

  if (!guru) return <div className="p-8 text-center text-white/30">Đang tìm Guru...</div>;

  const gs = getGuruStrategy(id);
  const metrics: BacktestMetrics | null = btResult?.metrics ?? null;
  const chartData: EquityPoint[] = btResult?.equity ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      <Link href="/dashboard/gurus" className="inline-flex items-center text-sm text-white/40 hover:text-white transition-colors mb-1">
        <ArrowLeft size={16} className="mr-1" /> Quay lại Hội đồng
      </Link>

      {/* Guru Header */}
      <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 to-transparent pointer-events-none" />
        <div className="w-24 h-24 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-5xl shrink-0 relative z-10">
          {guru.avatar}
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h1 className="text-2xl font-bold text-white mb-1">{guru.name}</h1>
          <p className="text-emerald-400 font-medium text-sm mb-2">{guru.title}</p>
          <p className="text-xs text-white/40 italic leading-relaxed">&ldquo;{guru.philosophy}&rdquo;</p>
          {gs && (
            <div className="mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#E6B84F]/10 text-[#E6B84F] border border-[#E6B84F]/20 font-mono">
                {gs.strategyLabel}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-5 relative z-10 shrink-0">
          <div className="text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Win Rate</div>
            <div className="text-xl font-bold text-white">{guru.winRate}%</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Avg Return</div>
            <div className="text-xl font-bold text-emerald-400">+{guru.avgReturn}%</div>
          </div>
        </div>
      </div>

      {/* Content: Locked / Unlocked */}
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center relative overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />
            <Lock className="w-14 h-14 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Watchlist Đang Khóa</h2>
            <p className="text-white/40 max-w-md mx-auto mb-8 text-sm leading-relaxed">{guru.lockedMessage}</p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleUnlock}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <Unlock size={16} />
                Mở khóa bằng 3 Cà Phê (300 XP)
              </button>
              <div className="text-sm text-white/30 flex items-center gap-1.5">
                <Coffee size={13} className="text-[#E6B84F]" />
                Bạn đang có: <span className="font-bold text-white">{Math.floor(userXp / 100)} Cà phê ({userXp} XP)</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* CTA: Backtest chiến lược */}
            {gs && (
              <div className="bg-gradient-to-r from-[#E6B84F]/10 to-transparent border border-[#E6B84F]/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] text-[#E6B84F]/60 uppercase tracking-wider font-mono mb-1">Chiến lược của {guru.name}</p>
                  <h3 className="text-white font-semibold">{gs.strategyLabel}</h3>
                  <p className="text-white/40 text-xs mt-0.5 max-w-md">{gs.description}</p>
                </div>
                <button
                  onClick={handleGoBacktest}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E6B84F] to-[#FFD700] text-black font-bold rounded-xl text-sm hover:opacity-90 transition-all whitespace-nowrap shrink-0"
                >
                  <FlaskConical size={15} />
                  Backtest chiến lược này
                </button>
              </div>
            )}

            {/* Performance Chart — Real backtest data */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white/70 flex items-center gap-2 text-sm">
                  <BarChart3 size={15} className="text-[#E6B84F]" />
                  Hiệu suất thực tế — {gs?.sampleTicker} (3 năm qua)
                </h2>
                {btResult && (
                  <span className="text-[10px] text-white/20 font-mono">{gs?.strategyLabel}</span>
                )}
              </div>

              {btLoading && (
                <div className="h-52 flex items-center justify-center text-white/30 text-sm">
                  Đang chạy backtest...
                </div>
              )}

              {btError && (
                <div className="h-52 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertTriangle size={14} /> {btError}
                  </div>
                </div>
              )}

              {!btLoading && !btError && chartData.length > 0 && (
                <>
                  {/* Metrics mini grid */}
                  {metrics && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      <MetricBadge label="CAGR" value={fmtPct(metrics.cagr)} positive={metrics.cagr > 0} />
                      <MetricBadge label="Tổng lợi nhuận" value={fmtPct(metrics.totalReturn)} positive={metrics.totalReturn > 0} />
                      <MetricBadge label="Sharpe" value={metrics.sharpe.toFixed(2)} positive={metrics.sharpe > 1} />
                      <MetricBadge label="Max Drawdown" value={`-${metrics.maxDrawdown.toFixed(1)}%`} positive={false} />
                    </div>
                  )}

                  {/* Equity Curve */}
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="gradEquityGuru" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E6B84F" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#E6B84F" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradBmGuru" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} tickFormatter={v => v.slice(0, 7)} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} tickFormatter={v => fmtCurrency(v)} width={68} />
                        <Tooltip
                          contentStyle={{ background: "#13141A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any, name: any) => [fmtCurrency(Number(value)), name === "equity" ? guru.name : "Buy & Hold"]}
                        />
                        <Legend formatter={v => v === "equity" ? guru.name : "Buy & Hold"} wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }} />
                        <Area type="monotone" dataKey="benchmark" stroke="#60A5FA" strokeWidth={1.5} fill="url(#gradBmGuru)" strokeDasharray="4 2" dot={false} />
                        <Area type="monotone" dataKey="equity" stroke="#E6B84F" strokeWidth={2} fill="url(#gradEquityGuru)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Verdict */}
                  {metrics && (
                    <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2 text-xs">
                      {metrics.totalReturn > 0 ? (
                        <TrendingUp size={13} className="text-emerald-400" />
                      ) : (
                        <TrendingDown size={13} className="text-red-400" />
                      )}
                      <span className="text-white/40">
                        Chiến lược này đã{" "}
                        <span className={metrics.totalReturn > 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                          {metrics.totalReturn > 0 ? "sinh lời" : "thua lỗ"}
                        </span>{" "}
                        {fmtPct(metrics.totalReturn)} trong 3 năm qua với cổ phiếu {gs?.sampleTicker}.
                        Vốn {fmtCurrency(100_000_000)} → {fmtCurrency(metrics.finalCapital)}.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Strategy Philosophy */}
            {gs && (
              <div className="bg-indigo-950/20 border border-indigo-500/15 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-indigo-400 mb-3">
                  <Percent size={15} />
                  <h3 className="font-semibold text-sm">Triết lý giao dịch — {guru.name}</h3>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">{gs.description}</p>
                <div className="mt-4 pt-4 border-t border-indigo-500/10 flex items-center justify-between">
                  <p className="text-[10px] text-white/20 font-mono">
                    * Equity curve tính trên {gs.sampleTicker} 3 năm gần nhất với vốn 100 tr VND
                  </p>
                  <button
                    onClick={handleGoBacktest}
                    className="flex items-center gap-1.5 text-[#E6B84F] text-xs hover:text-[#FFD700] transition-colors font-medium"
                  >
                    <FlaskConical size={12} />
                    Test với mã khác →
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-950/80 border border-red-500/30 text-red-200 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 z-50 pointer-events-none"
          >
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
