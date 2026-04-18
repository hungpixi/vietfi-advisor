"use client";

import { motion } from "framer-motion";
import { PieChart as PieChartIcon, Sparkles, TrendingUp, Calculator, RefreshCw, Brain, Clock, Shield, ArrowRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import Link from "next/link";
import { getRiskResult, getIncome, getBudgetPots, getDebts } from "@/lib/storage";
import { GoldTracker } from "@/components/portfolio/GoldTracker";
import { CashflowDNA } from "@/components/portfolio/CashflowDNA";
import { BASE_ALLOCATIONS, adjustAllocation, type AllocationItem } from "@/lib/constants/allocations";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface MarketData {
  vnIndex?: { price: number; changePct: number };
  goldSjc?: { goldVnd: number; changePct: number };
  btc?: { priceUsd: number; changePct24h: number };
  usdVnd?: { rate: number };
  macro?: { cpiYoY?: { value: number }[]; deposit12m?: { min: number; max: number } };
  sentimentScore?: number;
}

interface BacktestHistoryPoint {
  year: string;
  portfolioValue: number;
}

interface BacktestData {
  history: BacktestHistoryPoint[];
  currentValue: number;
}

interface ProjectionPoint {
  year: string;
  pessimistic: number;
  base: number;
  optimistic: number;
}

interface ProjectionData {
  data?: ProjectionPoint[];
}

const riskLabels: Record<string, string> = {
  conservative: "🛡️ BẢO THỦ",
  balanced: "⚖️ CÂN BẰNG",
  growth: "🚀 TĂNG TRƯỞNG"
};

function generateProjection(capital: number, riskType: string) {
  const rates = {
    conservative: { base: 0.06, pess: 0.03, opt: 0.08 },
    balanced: { base: 0.09, pess: 0.04, opt: 0.14 },
    growth: { base: 0.13, pess: 0.02, opt: 0.22 }
  };
  const r = rates[riskType as keyof typeof rates] || rates.balanced;
  return Array.from({ length: 11 }, (_, yr) => ({
    year: `Năm ${yr}`,
    pessimistic: Math.round(capital * Math.pow(1 + r.pess, yr) / 1000000),
    base: Math.round(capital * Math.pow(1 + r.base, yr) / 1000000),
    optimistic: Math.round(capital * Math.pow(1 + r.opt, yr) / 1000000),
  }));
}

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function formatVND(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)} TỶ`;
  return `${n} TRIỆU`;
}

export default function PortfolioPage() {
  const [capital, setCapital] = useState(100000000);
  const [riskType, setRiskType] = useState("balanced");
  const [hasRiskDNA, setHasRiskDNA] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [backtestData, setBacktestData] = useState<BacktestData | null>(null);
  const [projectionData, setProjectionData] = useState<ProjectionData | null>(null);
  const [userContext, setUserContext] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      const riskResult = getRiskResult();
      if (riskResult) {
        setHasRiskDNA(true);
        if (riskResult.score <= 6) setRiskType("conservative");
        else if (riskResult.score <= 10) setRiskType("balanced");
        else setRiskType("growth");
      }
      const income = getIncome();
      if (income > 0) setCapital(income * 6);
      const parts: string[] = [];
      const pots = getBudgetPots();
      if (pots.length > 0) {
        const totalBudget = pots.reduce((s, p) => s + p.allocated, 0);
        parts.push(`Budget: ${totalBudget.toLocaleString("vi-VN")}Đ`);
      }
      const debts = getDebts();
      if (debts.length > 0) {
        const totalDebt = debts.reduce((s, d) => s + d.principal, 0);
        parts.push(`Debt: ${totalDebt.toLocaleString("vi-VN")}Đ`);
      }
      if (income > 0) parts.push(`Income: ${income.toLocaleString("vi-VN")}Đ`);
      if (riskResult) parts.push(`Risk DNA: ${riskResult.label} (${riskResult.score}/15)`);
      setUserContext(parts.join(" • "));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/market-data", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMarketData(data); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetch(`/api/portfolio/backtest?capital=${capital}&riskType=${riskType}`)
      .then(r => r.json())
      .then(d => setBacktestData(d))
      .catch(() => { });

    fetch(`/api/portfolio/projection?capital=${capital}&riskType=${riskType}`)
      .then(r => r.json())
      .then(d => setProjectionData(d))
      .catch(() => { });
  }, [capital, riskType]);

  const fgScore = marketData?.sentimentScore ?? 50;
  const allocation = useMemo(() => {
    const base = BASE_ALLOCATIONS[riskType] || BASE_ALLOCATIONS.balanced;
    return adjustAllocation(base, fgScore);
  }, [riskType, fgScore]);
  const projection = projectionData?.data || generateProjection(capital, riskType);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <CyberHeader size="display">Cố vấn <span className="text-[#22C55E]">Danh mục</span></CyberHeader>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1 w-12 bg-[#22C55E]/50" />
          <p className="font-mono text-[12px] font-black uppercase tracking-[0.2em] text-[#22C55E]">
            TỐI ƯU HÓA TÀI SẢN THEO CHỈ SỐ THỊ TRƯỜNG
          </p>
        </div>
      </motion.div>

      {/* Input Module */}
      <CyberCard className="p-6 mb-6" showDecorators={false}>
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-[#22C55E]" />
              <CyberSubHeader>SỐ VỐN ĐẦU TƯ BAN ĐẦU (Đ)</CyberSubHeader>
            </div>
            <div className="relative group">
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3 text-lg text-white font-mono font-black outline-none focus:border-[#22C55E]/40 focus:bg-[#22C55E]/[0.02] transition-all"
              />
              <div className="absolute top-1/2 -right-1 group-focus-within:opacity-100 opacity-0 bg-[#22C55E] w-1 h-8 -translate-y-1/2 rounded-full transition-all" />
            </div>
            <CyberSubHeader className="mt-2 block">≈ {formatVND(capital / 1000000 * 1000000)} VND</CyberSubHeader>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#22C55E]" />
              <CyberSubHeader>KHẨU VỊ RỦI RO {hasRiskDNA && <span className="text-[#22C55E] tracking-widest">(TỰ ĐỘNG)</span>}</CyberSubHeader>
            </div>
            <div className="flex gap-2">
              {Object.entries(riskLabels).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setRiskType(val)}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border",
                    riskType === val
                      ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                      : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CyberCard>

      {/* Cashflow DNA Integration */}
      <CashflowDNA currentCapital={capital} />

      <div className="grid lg:grid-cols-5 gap-6 mb-6">
        {/* Allocation Column */}
        <div className="lg:col-span-2">
          <CyberCard className="p-6 h-full">
            <div className="flex items-center gap-2 mb-8">
              <PieChartIcon className="w-4 h-4 text-[#22C55E]" />
              <CyberHeader size="xs">Phân bổ chiến lược</CyberHeader>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-full aspect-square max-w-[200px] mb-8 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocation} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="percent" stroke="none">
                      {allocation.map((entry: AllocationItem, i: number) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#08110f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: 'white', fontSize: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <CyberTypography size="sm" variant="mono" className="text-white font-black">{riskType.toUpperCase()}</CyberTypography>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">CHIẾN LƯỢC</p>
                </div>
              </div>

              <div className="w-full space-y-2">
                {allocation.map((item: AllocationItem) => (
                  <div key={item.asset} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <CyberSubHeader>{item.asset.toUpperCase()}</CyberSubHeader>
                    </div>
                    <div className="text-right">
                      <CyberTypography size="xs" variant="mono" className="text-white font-black">{item.percent}%</CyberTypography>
                      <p className="text-[9px] text-white/20 font-mono mt-0.5">{((capital * item.percent) / 100 / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CyberCard>
        </div>

        {/* AI Insight Column */}
        <div className="lg:col-span-3 min-0">
          <CyberCard className="p-6 h-full" variant="success">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-4 h-4 text-[#22C55E]" />
              <CyberHeader size="xs">Cố vấn AI — Trực tiếp</CyberHeader>
            </div>

            {/* Market Context Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {marketData?.vnIndex && (
                <div className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black border",
                  marketData.vnIndex.changePct >= 0 ? "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]" : "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]"
                )}>
                  VNINDEX: {marketData.vnIndex.price} ({marketData.vnIndex.changePct >= 0 ? "+" : ""}{marketData.vnIndex.changePct}%)
                </div>
              )}
              {marketData?.goldSjc && (
                <div className="px-3 py-1 rounded-full text-[9px] font-black border bg-[#E6B84F]/10 border-[#E6B84F]/20 text-[#E6B84F]">
                  GOLD: {(marketData.goldSjc.goldVnd / 1000000).toFixed(1)}M
                </div>
              )}
              <div className="px-3 py-1 rounded-full text-[9px] font-black border bg-white/5 border-white/10 text-white/40">
                TÂM LÝ: {fgScore} ({fgScore <= 40 ? "SỢ HÃI" : fgScore >= 60 ? "THAM LAM" : "TRUNG LẬP"})
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-[13px] text-white/60 leading-relaxed font-mono uppercase">
                Profile <span className="text-white font-black">{riskLabels[riskType]}</span> • Vốn <span className="text-[#22C55E] font-black">{(capital / 1000000).toFixed(0)} TRIỆU</span>
                {fgScore <= 30 && " — Thị trường đang trong vùng Sợ hãi cực độ. Đây là thời điểm vàng để tăng tỷ trọng tài sản rủi ro (Chứng khoán) và giữ Vàng như lớp phòng thủ cuối cùng."}
                {fgScore > 30 && fgScore <= 60 && " — Trạng thái cân bằng. Tiếp tục duy trì danh mục tiêu chuẩn, không nên hưng phấn hay hoảng loạn quá mức."}
                {fgScore > 60 && " — Hưng phấn đang bao trùm. Khâu quản trị rủi ro cần được thắt chặt. Cân nhắc chốt lời một phần tài sản tăng nóng để tối ưu hóa lợi nhuận."}
              </p>

              {userContext && (
                <div className="p-3 rounded-lg bg-black/20 border border-dashed border-white/5">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">DỮ LIỆU CÁ NHÂN HÓA</span>
                  <p className="text-[10px] text-white/40 font-mono italic">{userContext}</p>
                </div>
              )}
            </div>

            {!hasRiskDNA && (
              <Link href="/dashboard/risk-profile" className="flex items-center gap-2 text-[10px] font-black uppercase text-[#22C55E] hover:underline mb-8 tracking-widest">
                <Brain className="w-4 h-4" /> Đồng bộ hóa Risk DNA ngay <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <div className="space-y-3">
              <CyberSubHeader className="text-[#22C55E] font-black">CHIẾN LƯỢC HÀNH ĐỘNG</CyberSubHeader>
              <div className="space-y-2">
                {[
                  { label: "Action 01", text: riskType === "conservative" ? "Gửi 50% vốn vào tiết kiệm online kỳ hạn 12T để khóa lãi suất." : riskType === "balanced" ? "Mua ETF VN30 hàng tháng để tích lũy cổ phiếu đầu ngành." : "Dành 40% vốn săn tìm các cổ phiếu Midcap có cơ bản tốt rớt sâu.", color: "#22C55E" },
                  { label: "Action 02", text: riskType === "conservative" ? "Trích 20% mua Vàng nhẫn 9999 làm bảo hiểm tài sản." : riskType === "balanced" ? "Giữ 30% quỹ tiền mặt để bắt đáy khi VN-Index điều chỉnh >10%." : "Trích 25% vốn vào BTC/ETH nhưng tuyệt đối không dùng đòn bẩy.", color: "#E6B84F" }
                ].map((act, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border-l-4 border-white/5 hover:border-l-[#22C55E]/60 transition-all flex items-start gap-3">
                    <span className="text-[9px] font-black text-white/20 mt-1 shrink-0">{act.label}</span>
                    <p className="text-[11px] text-white/70 leading-relaxed uppercase font-mono">{act.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-around border-t border-white/5 pt-6">
              <div className="text-center">
                <TrendingUp className="w-5 h-5 text-[#22C55E] mx-auto mb-2" />
                <CyberSubHeader>DỰ KIẾN CAGR</CyberSubHeader>
                <CyberMetric size="xs" color="text-[#22C55E]">{riskType === "conservative" ? "6%" : riskType === "balanced" ? "9%" : "13%"}</CyberMetric>
              </div>
              <div className="text-center">
                <RefreshCw className="w-5 h-5 text-[#E6B84F] mx-auto mb-2" />
                <CyberSubHeader>TÁI CÂN BẰNG</CyberSubHeader>
                <CyberMetric size="xs" color="text-[#E6B84F]">QUÝ / LẦN</CyberMetric>
              </div>
            </div>
          </CyberCard>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Backtest */}
        <CyberCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-[#22C55E]" />
            <CyberHeader size="xs">Backtest — Hiệu suất từ 2021</CyberHeader>
          </div>
          <p className="text-[11px] text-white/40 font-mono uppercase mb-6">
            Giả lập đầu tư {formatVND(capital / 1000000 * 1000000)} từ đầu năm 2021 đến nay:
          </p>
          <div className="h-64 mb-6 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={backtestData?.history.filter((_, i) => i % 12 === 0).map((d) => ({
                year: d.year,
                value: Math.round(d.portfolioValue / 1000000),
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)", fontWeight: 900 }} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#08110f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  formatter={(v) => `${formatVND(Number(v))}`}
                />
                <Area type="monotone" dataKey="value" stroke="#22C55E" fill="#22C55E" fillOpacity={0.05} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <CyberSubHeader className="block mb-1">GIÁ TRỊ HIỆN TẠI</CyberSubHeader>
              <CyberTypography size="sm" variant="mono" className="text-[#22C55E] font-black">
                {backtestData ? formatVND(Math.round(backtestData.currentValue / 1000000)) : "--"}
              </CyberTypography>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
              <CyberSubHeader className="block mb-1">TỔNG LỢI NHUẬN</CyberSubHeader>
              <CyberTypography size="sm" variant="mono" className="text-[#22C55E] font-black">
                {backtestData ? `+${Math.round((backtestData.currentValue / capital - 1) * 100)}%` : "--"}
              </CyberTypography>
            </div>
          </div>
        </CyberCard>

        {/* Projection */}
        <CyberCard className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#22C55E]" />
              <CyberHeader size="xs">Dự phóng tăng trưởng 10 năm</CyberHeader>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#22C55E]" /><span className="text-[8px] font-black text-white/40 uppercase">TỐT</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E6B84F]" /><span className="text-[8px] font-black text-white/40 uppercase">CƠ BẢN</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#EF4444]" /><span className="text-[8px] font-black text-white/40 uppercase">XẤU</span></div>
            </div>
          </div>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)", fontWeight: 900 }} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#08110f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  formatter={(v) => `${formatVND(Number(v))}`}
                />
                <Area type="monotone" dataKey="optimistic" stroke="#22C55E" fill="#22C55E" fillOpacity={0.03} strokeWidth={1.5} />
                <Area type="monotone" dataKey="base" stroke="#E6B84F" fill="#E6B84F" fillOpacity={0.08} strokeWidth={2.5} />
                <Area type="monotone" dataKey="pessimistic" stroke="#EF4444" fill="#EF4444" fillOpacity={0.03} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <CyberSubHeader className="text-center block mt-4 opacity-30 italic">LƯU Ý: ĐÂY LÀ DỰ PHÓNG TOÁN HỌC, KHÔNG PHẢI KHUYẾN NGHỊ ĐẦU TƯ</CyberSubHeader>
        </CyberCard>
      </div>

      <GoldTracker marketData={marketData} />
    </motion.div>
  );
}
