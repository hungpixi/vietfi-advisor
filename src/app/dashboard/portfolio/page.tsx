"use client";

import { motion } from "framer-motion";
import { PieChart as PieChartIcon, Sparkles, TrendingUp, Calculator, RefreshCw, Brain, AlertTriangle, Loader2, BarChart2, Dices } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import Link from "next/link";
import { getRiskResult, getIncome, getBudgetPots, getDebts } from "@/lib/storage";
import { GoldTracker } from "@/components/portfolio/GoldTracker";
import { CashflowDNA } from "@/components/portfolio/CashflowDNA";
import { BASE_ALLOCATIONS, adjustAllocation, type AllocationItem } from "@/lib/constants/allocations";
import { UNIT_TRUST_PRODUCTS, isStale, type UnitTrustProduct } from "@/lib/affiliate/gold-partners";
import { trackEvent } from "@/lib/affiliate/analytics";
import { PremiumGateModal } from "@/components/gamification/PremiumGateModal";
import { isPremiumActive } from "@/lib/premium";

/* ─── Types ─── */
interface MarketData {
  vnIndex?: { price: number; changePct: number };
  goldSjc?: { goldVnd: number; changePct: number };
  btc?: { priceUsd: number; changePct24h: number };
  usdVnd?: { rate: number };
  macro?: { cpiYoY?: { value: number }[]; deposit12m?: { min: number; max: number } };
  sentimentScore?: number;
}

const riskLabels: Record<string, string> = { conservative: "🛡️ Bảo thủ", balanced: "⚖️ Cân bằng", growth: "🚀 Tăng trưởng" };

function generateProjection(capital: number, riskType: string) {
  const rates = { conservative: { base: 0.06, pess: 0.03, opt: 0.08 }, balanced: { base: 0.09, pess: 0.04, opt: 0.14 }, growth: { base: 0.13, pess: 0.02, opt: 0.22 } };
  const r = rates[riskType as keyof typeof rates] || rates.balanced;
  return Array.from({ length: 11 }, (_, yr) => ({
    year: `Năm ${yr}`,
    pessimistic: Math.round(capital * Math.pow(1 + r.pess, yr) / 1000000),
    base: Math.round(capital * Math.pow(1 + r.base, yr) / 1000000),
    optimistic: Math.round(capital * Math.pow(1 + r.opt, yr) / 1000000),
  }));
}

const CATEGORY_LABELS: Record<string, string> = {
  equity: "Cổ phiếu",
  bond: "Trái phiếu",
  balanced: "Cân bằng",
  money_market: "Thị trường tiền tệ",
};

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function formatVND(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)} tỷ`;
  return `${n} triệu`;
}

export default function PortfolioPage() {
  const [capital, setCapital] = useState(100000000);
  const [riskType, setRiskType] = useState("balanced");
  const [hasRiskDNA, setHasRiskDNA] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [backtestData, setBacktestData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projectionData, setProjectionData] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [userContext, setUserContext] = useState<string>("");
  const [premiumGate, setPremiumGate] = useState<{ featureName: string } | null>(null);
  const [monteCarloData, setMonteCarloData] = useState<unknown>(null);

  // ── Monte Carlo handler (PREMIUM-gated) ──
  const handleMonteCarlo = useCallback(async () => {
    if (!isPremiumActive()) {
      setPremiumGate({ featureName: "Monte Carlo Projection" });
      return;
    }
    // TODO(Phase 3): real Monte Carlo API call
    // eslint-disable-next-line no-console
    console.info("[Monte Carlo] Phase 3 — coming soon");
    setMonteCarloData("coming-soon");
  }, []);

  // ── Pull Risk DNA from localStorage on mount ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const riskResult = getRiskResult();
    if (riskResult) {
      setHasRiskDNA(true);
      // v2: use the `type` field directly (probabilistic classification)
      // v1 fallback: re-map from score if type is missing
      const riskType = riskResult.type ?? (
        riskResult.score <= 8 ? 'conservative'
          : riskResult.score <= 11 ? 'balanced'
            : 'growth'
      );
      setRiskType(riskType);
    }

    // Pull income for capital suggestion
    const income = getIncome();
    if (income > 0) {
      setCapital(income * 6); // Suggest 6 months income as starting capital
    }

    // Build user context for AI
    const parts: string[] = [];
    const pots = getBudgetPots();
    if (pots.length > 0) {
      const totalBudget = pots.reduce((s, p) => s + p.allocated, 0);
      parts.push(`Ngân sách tháng: ${totalBudget.toLocaleString("vi-VN")}đ`);
    }
    const debts = getDebts();
    if (debts.length > 0) {
      const totalDebt = debts.reduce((s, d) => s + d.principal, 0);
      parts.push(`Tổng nợ: ${totalDebt.toLocaleString("vi-VN")}đ`);
    }
    if (income > 0) parts.push(`Thu nhập: ${income.toLocaleString("vi-VN")}đ/tháng`);
    if (riskResult) {
      const confPct = riskResult.confidence != null
        ? ` (tin cậy ${Math.round(riskResult.confidence * 100)}%)`
        : '';
      parts.push(`Risk DNA: ${riskResult.label}${confPct}`);
    }
    setUserContext(parts.join(", "));
  }, []);

  // ── Fetch live market data ──
  useEffect(() => {
    fetch("/api/market-data", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMarketData(data); })
      .catch(() => { });
  }, []);

  // ── Fetch dynamic backtest and projection ──
  useEffect(() => {
    fetch(`/api/portfolio/backtest?capital=${capital}&riskType=${riskType}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setBacktestData(d))
      .catch(() => { setBacktestData(null); });

    fetch(`/api/portfolio/projection?capital=${capital}&riskType=${riskType}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setProjectionData(d))
      .catch(() => { setProjectionData(null); });
  }, [capital, riskType]);

  // ── Dynamic allocation based on market sentiment ──
  const fgScore = marketData?.sentimentScore ?? 50;
  const allocation = useMemo(() => {
    const base = BASE_ALLOCATIONS[riskType] || BASE_ALLOCATIONS.balanced;
    return adjustAllocation(base, fgScore);
  }, [riskType, fgScore]);
  const projection = projectionData?.data || generateProjection(capital, riskType);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">
          Cố vấn <span className="text-gradient">danh mục</span>
        </h1>
        <p className="text-[13px] text-white/40">
          Nhập số vốn + chọn khẩu vị rủi ro → AI gợi ý phân bổ + dự phóng 10 năm
        </p>
      </motion.div>

      {/* Input */}
      <motion.div variants={fadeIn} className="glass-card p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1.5">Số vốn ban đầu</label>
            <div className="relative">
              <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[#E6B84F]/30 transition-colors"
                placeholder="100000000"
              />
            </div>
            <p className="text-[10px] text-white/20 mt-1">= {(capital / 1000000).toFixed(0)} triệu VND</p>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1.5">Khẩu vị rủi ro {hasRiskDNA && <span className="text-[#22C55E]">(từ Risk DNA)</span>}</label>
            <div className="flex gap-2">
              {Object.entries(riskLabels).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setRiskType(val)}
                  className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${riskType === val
                    ? "bg-[#E6B84F]/15 text-[#E6B84F] border border-[#E6B84F]/20"
                    : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/10"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tích hợp Component Cashflow DNA & Mục Tiêu Sống */}
      <CashflowDNA currentCapital={capital} />

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Allocation Pie */}
        <motion.div variants={fadeIn} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-[#E6B84F]" />
            Gợi ý phân bổ
          </h3>
          <div className="flex items-center gap-5">
            <div className="w-40 h-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="percent" stroke="none">
                    {allocation.map((entry: AllocationItem, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#F5F3EE", fontSize: 11 }}
                    formatter={(value: unknown) => `${value}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {allocation.map((item: AllocationItem) => (
                <div key={item.asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-white/50">{item.asset}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white/80">{item.percent}%</span>
                    <span className="text-[10px] text-white/25 ml-1.5">{capital > 0 && item.percent != null ? ((capital * item.percent) / 100 / 1000000).toFixed(1) : "0"}tr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* AI Insight — LIVE, kéo market data + user context */}
        <motion.div variants={fadeIn} className="glass-card p-5 border-[#E6B84F]/10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#E6B84F]" />
              <h3 className="text-sm font-semibold text-white">AI Insight — Cá nhân hóa</h3>
            </div>

            {/* Market data pills */}
            {marketData && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {marketData.vnIndex && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${marketData.vnIndex.changePct >= 0 ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                    VN-Index: {marketData.vnIndex.price} ({marketData.vnIndex.changePct >= 0 ? '+' : ''}{marketData.vnIndex.changePct}%)
                  </span>
                )}
                {marketData.goldSjc && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E6B84F]/10 text-[#E6B84F]">
                    Vàng: {(marketData.goldSjc.goldVnd / 1000000).toFixed(1)}tr
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${fgScore <= 30 ? 'bg-[#EF4444]/10 text-[#EF4444]' : fgScore >= 70 ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-white/5 text-white/40'}`}>
                  F&G: {fgScore} ({fgScore <= 20 ? 'Cực Sợ' : fgScore <= 40 ? 'Sợ hãi' : fgScore <= 60 ? 'Trung tính' : fgScore <= 80 ? 'Tham lam' : 'Cực Tham'})
                </span>
              </div>
            )}

            <p className="text-[13px] text-white/50 leading-relaxed mb-3">
              Với profile <strong className="text-white/70">{riskLabels[riskType]}</strong> và vốn{" "}
              <strong className="text-white/70">{(capital / 1000000).toFixed(0)} triệu</strong>
              {fgScore <= 30 && " — Nhiệt kế thị trường đang ở vùng Sợ hãi → tăng tỷ trọng tài sản an toàn (tiết kiệm, vàng). Chứng khoán có cơ hội tích lũy nếu VN-Index tiếp tục giảm."}
              {fgScore > 30 && fgScore <= 60 && " — Thị trường trung tính → giữ phân bổ cân bằng theo khẩu vị rủi ro."}
              {fgScore > 60 && " — Thị trường Tham lam → cẩn thận FOMO. Giảm dần vị thế rủi ro, tăng cash reserve."}
              {userContext && <><br /><span className="text-[11px] text-white/30">📊 {userContext}</span></>}
            </p>

            {!hasRiskDNA && (
              <Link href="/dashboard/risk-profile" className="inline-flex items-center gap-1.5 text-[11px] text-[#E6B84F] hover:text-[#FFD700] transition-colors mb-3">
                <Brain className="w-3.5 h-3.5" />
                Làm quiz Tính cách Đầu tư để cá nhân hóa tốt hơn →
              </Link>
            )}

            <div className="mt-4 mb-4 pt-4 border-t border-[#E6B84F]/10">
              <h4 className="text-[10px] font-bold text-[#E6B84F] mb-2 uppercase tracking-wider">Hành động cụ thể (Action Cards)</h4>
              <div className="space-y-2">
                {riskType === "conservative" && (
                  <>
                    <div className="bg-white/5 p-2.5 rounded border border-[#00E5FF]/20 text-[11px] text-white/70 leading-relaxed">
                      <strong className="text-[#00E5FF]">Hành động 1:</strong> Gửi ngay 50% tiền nhàn rỗi vào sổ tiết kiệm online kỳ hạn linh hoạt.
                    </div>
                    <div className="bg-white/5 p-2.5 rounded border border-[#E6B84F]/20 text-[11px] text-white/70 leading-relaxed">
                      <strong className="text-[#E6B84F]">Hành động 2:</strong> Trích 20% mua vàng SJC hoặc nhẫn trơn 9999 làm tài sản trú ẩn dài hạn.
                    </div>
                  </>
                )}
                {riskType === "balanced" && (
                  <>
                    <div className="bg-white/5 p-2.5 rounded border border-[#22C55E]/20 text-[11px] text-white/70 leading-relaxed">
                      <strong className="text-[#22C55E]">Hành động 1:</strong> Mua chứng chỉ quỹ ETF (VN30/VN100) hàng tháng để trung bình giá cổ phiếu.
                    </div>
                    <div className="bg-white/5 p-2.5 rounded border border-[#00E5FF]/20 text-[11px] text-white/70 leading-relaxed">
                      <strong className="text-[#00E5FF]">Hành động 2:</strong> Giữ 30% tiền mặt/tiết kiệm như quỹ khẩn cấp để bắt đáy khi thị trường hoảng loạn.
                    </div>
                  </>
                )}
                {riskType === "growth" && (
                  <>
                    <div className="bg-white/5 p-2.5 rounded border border-[#22C55E]/20 text-[11px] text-white/70 leading-relaxed">
                      <strong className="text-[#22C55E]">Hành động 1:</strong> Dồn 40% vào thị trường Cổ phiếu: Tự mua các mã rớt sâu hoặc mua ETF theo định kỳ.
                    </div>
                    <div className="bg-white/5 p-2.5 rounded border border-[#AB47BC]/20 text-[11px] text-white/70 leading-relaxed">
                      <strong className="text-[#AB47BC]">Hành động 2:</strong> Trích 25% mua Crypto (BTC/ETH). Biến động cực mạnh nên dứt khoát Không All-in.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center">
                <TrendingUp className="w-5 h-5 text-[#22C55E] mx-auto mb-0.5" />
                <p className="text-[10px] text-white/25">CAGR dự kiến</p>
                <p className="text-sm font-bold text-[#22C55E]">{riskType === "conservative" ? "6%" : riskType === "balanced" ? "9%" : "13%"}</p>
              </div>
              <div className="text-center">
                <RefreshCw className="w-5 h-5 text-[#E6B84F] mx-auto mb-0.5" />
                <p className="text-[10px] text-white/25">Tái cân bằng</p>
                <p className="text-sm font-bold text-[#E6B84F]">Quý/lần</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Backtest — "Nếu bạn đầu tư từ 2021..." */}
      <motion.div variants={fadeIn} className="glass-card p-5 mb-4 border border-[#22C55E]/10">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#22C55E]" />
          <h3 className="text-sm font-semibold text-white">Backtest — Nếu bạn đầu tư từ 2021</h3>
        </div>
        <p className="text-[11px] text-white/30 mb-3">
          Giả lập nếu bạn đầu tư <strong className="text-white/60">{(capital / 1000000).toFixed(0)} triệu</strong> theo phân bổ <strong className="text-white/60">{riskLabels[riskType]}</strong> từ đầu năm 2021:
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={Array.isArray(backtestData?.history)
              ? backtestData.history.filter((_: unknown, i: number) => i % 12 === 0).map((d: { year: string, portfolioValue: number }) => ({
                year: d.year,
                value: Math.round(d.portfolioValue / 1000000),
              }))
              : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatVND(v)} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#F5F3EE", fontSize: 11 }} formatter={(v: unknown) => `${formatVND(v as number)}`} />
              <Area type="monotone" dataKey="value" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} strokeWidth={2} name="Giá trị danh mục" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 p-3 bg-white/[0.02] rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/40">Vốn ban đầu (2021)</span>
            <span className="text-xs font-medium text-white/60">{(capital / 1000000).toFixed(0)} triệu</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-white/40">Giá trị hiện tại ({new Date().getFullYear()})</span>
            <span className="text-xs font-bold text-[#22C55E]">
              {backtestData?.currentValue != null ? Math.round(backtestData.currentValue / 1000000) : '--'} triệu
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-white/40">Lợi nhuận gộp</span>
            <span className="text-xs font-bold text-[#22C55E]">
              {backtestData?.currentValue != null ? `+${Math.round((backtestData.currentValue / capital - 1) * 100)}%` : '--'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-white/40">CAGR thực tế</span>
            <span className="text-xs font-bold text-[#22C55E]">
              {backtestData?.cagr != null ? `${backtestData.cagr}%/năm` : '--'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 10-Year Projection */}
      <motion.div variants={fadeIn} className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Dự phóng 10 năm (3 kịch bản)</h3>
          <button
            onClick={handleMonteCarlo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E6B84F]/10 hover:bg-[#E6B84F]/20 border border-[#E6B84F]/20 rounded-lg text-xs text-[#E6B84F] transition-colors"
          >
            <Dices className="w-3.5 h-3.5" />
            Monte Carlo
            <span className="text-[9px] bg-[#E6B84F]/20 px-1.5 py-0.5 rounded font-mono">VIP</span>
          </button>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatVND(v)} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#F5F3EE", fontSize: 11 }} formatter={(v: unknown) => `${formatVND(v as number)}`} />
              <Area type="monotone" dataKey="optimistic" stroke="#22C55E" fill="#22C55E" fillOpacity={0.05} strokeWidth={1.5} name={projectionData?.scenarios?.[0] || "Bull"} />
              <Area type="monotone" dataKey="base" stroke="#E6B84F" fill="#E6B84F" fillOpacity={0.1} strokeWidth={2} name={projectionData?.scenarios?.[1] || "Base"} />
              <Area type="monotone" dataKey="pessimistic" stroke="#EF4444" fill="#EF4444" fillOpacity={0.05} strokeWidth={1.5} name={projectionData?.scenarios?.[2] || "Bear"} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2">
          <span className="flex items-center gap-1 text-[10px] text-[#EF4444]"><div className="w-2 h-2 rounded-full bg-[#EF4444]" />Bi quan</span>
          <span className="flex items-center gap-1 text-[10px] text-[#E6B84F]"><div className="w-2 h-2 rounded-full bg-[#E6B84F]" />Cơ sở</span>
          <span className="flex items-center gap-1 text-[10px] text-[#22C55E]"><div className="w-2 h-2 rounded-full bg-[#22C55E]" />Lạc quan</span>
        </div>
      </motion.div>

      {/* Sổ Vàng (Physical Gold Tracker) */}
      <motion.div variants={fadeIn} className="mt-6">
        <GoldTracker marketData={marketData} />
      </motion.div>

      {/* ─── Unit Trust Recommendations ─── */}
      <motion.div variants={fadeIn} className="glass-card p-5 border border-[#22C55E]/10 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <h3 className="text-sm font-semibold text-white">Quỹ Đầu Tư — Danh Mục VietFi</h3>
          <span className="text-[9px] bg-[#22C55E]/10 text-[#22C55E] px-2 py-0.5 rounded font-mono uppercase">Affiliate</span>
        </div>
        <div className="space-y-3">
          {UNIT_TRUST_PRODUCTS.map((fund: UnitTrustProduct) => {
            const stale = isStale(fund);
            return (
              <a
                key={fund.id}
                href={fund.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent({ type: "GOLD_AFFILIATE_CLICK", vendorId: fund.id })}
                className="block p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-[#22C55E]/20 rounded-xl transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[13px] text-white leading-tight flex items-center gap-2">
                      {fund.fundName}
                      {stale && (
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-mono">
                          Cũ
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">{fund.fundHouse} · {fund.fundCode}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60">{CATEGORY_LABELS[fund.category]}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60">NAV: {new Intl.NumberFormat("vi-VN").format(fund.nav)}đ</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60">Phí quản lý: {(fund.aumFee * 100).toFixed(1)}%/năm</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[14px] font-bold ${fund.return1yr >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                      {fund.return1yr >= 0 ? "+" : ""}{fund.return1yr}%
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5">1 năm</div>
                    <div className="text-[10px] text-[#22C55E]/60 mt-1">3yr: +{fund.return3yr}%</div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
        {/* HIGH-1: Affiliate disclosure */}
        <p className="text-[10px] text-white/20 mt-3 text-center">
          Liên kết tài chính. VietFi nhận phí giới thiệu từ các đối tác trên.
        </p>
      </motion.div>

      {/* Premium Gate Modal */}
      {premiumGate && (
        <PremiumGateModal
          featureName={premiumGate.featureName}
          onClose={() => setPremiumGate(null)}
        />
      )}
    </motion.div>
  );
}
