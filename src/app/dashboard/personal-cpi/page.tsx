"use client";

import { motion } from "framer-motion";
import { Calculator, AlertTriangle, ArrowUpRight, Info, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { CPI_CATEGORIES, calculatePersonalCPI } from "@/lib/calculations/personal-cpi";

/* ─── Budget → CPI mapping ─── */
const BUDGET_TO_CPI: Record<string, string> = {
  "Ăn uống": "food",
  "Shopping": "other",
  "Đi lại": "transport",
  "Nhà ở": "housing",
  "Giải trí": "entertainment",
  "Sức khỏe": "healthcare",
  "Học tập": "education",
};

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function PersonalCPIPage() {
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    CPI_CATEGORIES.forEach((c) => { init[c.id] = c.officialWeight; });
    return init;
  });
  const [imported, setImported] = useState(false);

  const importFromBudget = () => {
    try {
      const savedPots = localStorage.getItem("vietfi_pots");
      const savedExpenses = localStorage.getItem("vietfi_expenses");
      if (!savedPots) return;
      const pots: { id: string; name: string; allocated: number }[] = JSON.parse(savedPots);
      const expenses: { potId: string; amount: number }[] = savedExpenses ? JSON.parse(savedExpenses) : [];

      // Tính tổng chi/allocated cho mỗi pot
      const potSpend: Record<string, number> = {};
      for (const pot of pots) {
        const spent = expenses
          .filter((e) => e.potId === pot.id)
          .reduce((s, e) => s + e.amount, 0);
        potSpend[pot.name] = spent || pot.allocated;
      }

      // Map budget → CPI weights
      const newWeights: Record<string, number> = {};
      CPI_CATEGORIES.forEach((c) => { newWeights[c.id] = 0; });

      let total = 0;
      for (const [potName, amount] of Object.entries(potSpend)) {
        const cpiId = BUDGET_TO_CPI[potName];
        if (cpiId) {
          newWeights[cpiId] = (newWeights[cpiId] || 0) + amount;
          total += amount;
        }
      }

      // Normalize to percentage
      if (total > 0) {
        for (const id of Object.keys(newWeights)) {
          newWeights[id] = Math.round((newWeights[id] / total) * 100);
        }
      }

      setWeights(newWeights);
      setImported(true);
    } catch { /* ignore */ }
  };

  const result = calculatePersonalCPI(weights);

  const handleSlider = (id: string, value: number) => {
    setWeights((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">
          Lạm phát <span className="text-gradient">của tôi</span>
        </h1>
        <p className="text-[13px] text-white/40">
          Điều chỉnh trọng số chi tiêu → tính lạm phát &ldquo;thật sự&rdquo; ảnh hưởng đến bạn
        </p>
      </motion.div>

      {/* Big Number */}
      <motion.div variants={fadeIn} className="grid sm:grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-5 text-center border-[#E6B84F]/10 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">LẠM PHÁT CỦA BẠN</span>
            <div className="text-5xl font-black mt-2" style={{ color: result.isHigher ? "#EF4444" : "#22C55E" }}>
              {result.personalRate}%
            </div>
            {result.isHigher && (
              <p className="text-xs text-[#EF4444] mt-2 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Cao hơn CPI chính thức {(result.personalRate - result.officialRate).toFixed(1)}%
              </p>
            )}
          </div>
        </div>
        <div className="glass-card p-5 text-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">CPI CHÍNH THỨC (GSO 2025)</span>
          <div className="text-5xl font-black text-white/50 mt-2">{result.officialRate}%</div>
          <p className="text-xs text-white/25 mt-2">Tổng cục Thống kê</p>
        </div>
      </motion.div>

      {/* Ratio Bar */}
      {result.isHigher && (
        <motion.div variants={fadeIn} className="glass-card p-4 mb-6 border-[#EF4444]/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#EF4444]">Lạm phát ảnh hưởng bạn gấp {result.ratio}x!</h3>
              <p className="text-xs text-white/40 mt-1">
                Chi tiêu của bạn tập trung vào các danh mục có CPI cao (nhà ở, ăn uống). 
                Lãi suất tiết kiệm 5.2%/năm có thể chưa đủ bù lạm phát thực tế.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sliders */}
      <motion.div variants={fadeIn} className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#E6B84F]" />
            Trọng số chi tiêu của bạn
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={importFromBudget}
              className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors ${imported ? "text-[#22C55E] bg-[#22C55E]/10" : "text-[#E6B84F] hover:bg-[#E6B84F]/10"}`}
            >
              <Download className="w-3 h-3" />
              {imported ? "Đã nhập ✓" : "Nhập từ Quỹ Chi tiêu"}
            </button>
            <button
              onClick={() => {
                const init: Record<string, number> = {};
                CPI_CATEGORIES.forEach((c) => { init[c.id] = c.officialWeight; });
                setWeights(init);
                setImported(false);
              }}
              className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {CPI_CATEGORIES.map((cat) => {
            const w = weights[cat.id] || 0;
            const catResult = result.categories.find((c) => c.name === cat.name);
            return (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="text-xs text-white/60">{cat.name}</span>
                    <span className="text-[9px] text-white/20">(CPI: {cat.officialRate}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/80">{catResult?.userWeight.toFixed(0)}%</span>
                    <span className="text-[9px] text-white/20">GSO: {cat.officialWeight}%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={w}
                  onChange={(e) => handleSlider(cat.id, Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-white/5 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#E6B84F] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(230,184,79,0.3)]"
                />
              </div>
            );
          })}
        </div>

        {/* Contribution Breakdown */}
        <div className="mt-6 pt-4 border-t border-white/[0.04]">
          <h4 className="text-[10px] font-mono uppercase tracking-wider text-white/20 mb-3">ĐÓNG GÓP VÀO LẠM PHÁT CÁ NHÂN</h4>
          <div className="space-y-1.5">
            {result.categories
              .sort((a, b) => b.contribution - a.contribution)
              .map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <span className="text-sm w-6">{cat.emoji}</span>
                  <span className="text-xs text-white/40 w-28 truncate">{cat.name}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E6B84F]"
                      style={{ width: `${(cat.contribution / result.personalRate) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/30 w-12 text-right">{cat.contribution.toFixed(2)}%</span>
                </div>
              ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
