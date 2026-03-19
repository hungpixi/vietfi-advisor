"use client";

import { motion } from "framer-motion";
import { PieChart as PieChartIcon, Sparkles, TrendingUp, Calculator, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

/* ─── Demo data ─── */
const riskTypes = [
  { value: "conservative", label: "🛡️ Bảo thủ", allocation: [
    { asset: "Tiết kiệm", percent: 50, color: "#00E5FF" },
    { asset: "Trái phiếu", percent: 20, color: "#AB47BC" },
    { asset: "Vàng", percent: 20, color: "#E6B84F" },
    { asset: "Chứng khoán", percent: 10, color: "#22C55E" },
  ]},
  { value: "balanced", label: "⚖️ Cân bằng", allocation: [
    { asset: "Tiết kiệm", percent: 30, color: "#00E5FF" },
    { asset: "Vàng", percent: 20, color: "#E6B84F" },
    { asset: "Chứng khoán", percent: 30, color: "#22C55E" },
    { asset: "Crypto", percent: 10, color: "#AB47BC" },
    { asset: "BĐS (REIT)", percent: 10, color: "#FF6B35" },
  ]},
  { value: "growth", label: "🚀 Tăng trưởng", allocation: [
    { asset: "Tiết kiệm", percent: 15, color: "#00E5FF" },
    { asset: "Vàng", percent: 10, color: "#E6B84F" },
    { asset: "Chứng khoán", percent: 40, color: "#22C55E" },
    { asset: "Crypto", percent: 25, color: "#AB47BC" },
    { asset: "BĐS (REIT)", percent: 10, color: "#FF6B35" },
  ]},
];

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

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function formatVND(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)} tỷ`;
  return `${n} triệu`;
}

export default function PortfolioPage() {
  const [capital, setCapital] = useState(100000000); // 100 triệu
  const [riskType, setRiskType] = useState("balanced");

  const currentRisk = riskTypes.find((r) => r.value === riskType)!;
  const projection = generateProjection(capital, riskType);

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
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1.5">Khẩu vị rủi ro</label>
            <div className="flex gap-2">
              {riskTypes.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRiskType(r.value)}
                  className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${
                    riskType === r.value
                      ? "bg-[#E6B84F]/15 text-[#E6B84F] border border-[#E6B84F]/20"
                      : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/10"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

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
                  <Pie data={currentRisk.allocation} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="percent" stroke="none">
                    {currentRisk.allocation.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#F5F3EE", fontSize: 11 }}
                    formatter={(value: unknown) => `${value}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {currentRisk.allocation.map((item) => (
                <div key={item.asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-white/50">{item.asset}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white/80">{item.percent}%</span>
                    <span className="text-[10px] text-white/25 ml-1.5">{((capital * item.percent) / 100 / 1000000).toFixed(1)}tr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* AI Insight */}
        <motion.div variants={fadeIn} className="glass-card p-5 border-[#E6B84F]/10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#E6B84F]" />
              <h3 className="text-sm font-semibold text-white">AI Insight</h3>
            </div>
            <p className="text-[13px] text-white/50 leading-relaxed mb-3">
              Với profile <strong className="text-white/70">{currentRisk.label}</strong> và vốn{" "}
              <strong className="text-white/70">{(capital / 1000000).toFixed(0)} triệu</strong>, Nhiệt kế thị trường hiện ở vùng Sợ hãi (38) → nên tăng tỷ trọng tài sản an toàn. Vàng đang đắt (93.5tr) nên chỉ giữ, không mua thêm. Chứng khoán có cơ hội tích lũy nếu VN-Index test 1,250.
            </p>
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
          Giả lập nếu bạn đầu tư <strong className="text-white/60">{(capital / 1000000).toFixed(0)} triệu</strong> theo phân bổ <strong className="text-white/60">{currentRisk.label}</strong> từ đầu năm 2021:
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(() => {
              const returns: Record<string, number[]> = {
                conservative: [1, 1.05, 1.02, 1.08, 1.14, 1.21],
                balanced:     [1, 1.12, 1.06, 1.15, 1.28, 1.42],
                growth:       [1, 1.25, 1.08, 1.22, 1.45, 1.68],
              };
              const r = returns[riskType] || returns.balanced;
              return r.map((m, i) => ({
                year: `${2021 + i}`,
                value: Math.round((capital * m) / 1000000),
              }));
            })()}>
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
            <span className="text-[11px] text-white/40">Giá trị hiện tại (2026)</span>
            <span className="text-xs font-bold text-[#22C55E]">
              {Math.round((capital * (riskType === "conservative" ? 1.21 : riskType === "balanced" ? 1.42 : 1.68)) / 1000000)} triệu
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-white/40">Lợi nhuận</span>
            <span className="text-xs font-bold text-[#22C55E]">
              +{riskType === "conservative" ? "21" : riskType === "balanced" ? "42" : "68"}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* 10-Year Projection */}
      <motion.div variants={fadeIn} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Dự phóng 10 năm (3 kịch bản)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatVND(v)} />
              <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#F5F3EE", fontSize: 11 }} formatter={(v: unknown) => `${formatVND(v as number)}`} />
              <Area type="monotone" dataKey="optimistic" stroke="#22C55E" fill="#22C55E" fillOpacity={0.05} strokeWidth={1.5} name="Lạc quan" />
              <Area type="monotone" dataKey="base" stroke="#E6B84F" fill="#E6B84F" fillOpacity={0.1} strokeWidth={2} name="Cơ sở" />
              <Area type="monotone" dataKey="pessimistic" stroke="#EF4444" fill="#EF4444" fillOpacity={0.05} strokeWidth={1.5} name="Bi quan" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2">
          <span className="flex items-center gap-1 text-[10px] text-[#EF4444]"><div className="w-2 h-2 rounded-full bg-[#EF4444]" />Bi quan</span>
          <span className="flex items-center gap-1 text-[10px] text-[#E6B84F]"><div className="w-2 h-2 rounded-full bg-[#E6B84F]" />Cơ sở</span>
          <span className="flex items-center gap-1 text-[10px] text-[#22C55E]"><div className="w-2 h-2 rounded-full bg-[#22C55E]" />Lạc quan</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
