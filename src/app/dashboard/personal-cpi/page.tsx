"use client";

import { motion } from "framer-motion";
import { Calculator, AlertTriangle, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { CPI_CATEGORIES, calculatePersonalCPI } from "@/lib/calculations/personal-cpi";
import { getBudgetPots, getExpenses } from "@/lib/storage";
import RequireTier from "@/components/gamification/RequireTier";
import { UserRole } from "@/lib/rbac";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    // Initial load if needed
  }, []);

  const importFromBudget = () => {
    try {
      const pots = getBudgetPots();
      const expenses = getExpenses();
      if (pots.length === 0) return;

      const potSpend: Record<string, number> = {};
      for (const pot of pots) {
        const spent = expenses
          .filter((e) => e.potId === pot.id)
          .reduce((s, e) => s + e.amount, 0);
        potSpend[pot.name] = spent || pot.allocated;
      }

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
    <RequireTier requiredRole={UserRole.PRO} featureName="Lạm Phát Của Tôi">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeIn} className="mb-6">
          <CyberHeader size="display">Lạm phát <span className="text-[#22C55E]">của tôi</span></CyberHeader>
          <CyberSubHeader className="mt-1">
            Điều chỉnh trọng số chi tiêu → tính lạm phát &ldquo;thật sự&rdquo; ảnh hưởng đến bạn
          </CyberSubHeader>
        </motion.div>

        {/* Big Number Cards */}
        <motion.div variants={fadeIn} className="grid sm:grid-cols-2 gap-3 mb-6">
          <CyberCard className="p-5 text-center flex flex-col items-center justify-center min-h-[160px]" variant={result.isHigher ? "danger" : "success"}>
            <CyberSubHeader>LẠM PHÁT CỦA BẠN</CyberSubHeader>
            <CyberMetric size="3xl" color={result.isHigher ? "text-[#EF4444]" : "text-[#22C55E]"} className="mt-2 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              {result.personalRate}%
            </CyberMetric>
            {result.isHigher && (
              <div className="flex items-center gap-1 mt-2 px-2 py-0.5 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-full">
                <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                <CyberSubHeader color="text-[#EF4444]">+{(result.personalRate - result.officialRate).toFixed(1)}% so với chính thức</CyberSubHeader>
              </div>
            )}
          </CyberCard>

          <CyberCard className="p-5 text-center flex flex-col items-center justify-center min-h-[160px]" showDecorators={false}>
            <CyberSubHeader>CPI CHÍNH THỨC (GSO 2025)</CyberSubHeader>
            <CyberMetric size="3xl" color="text-white/40" className="mt-2">
              {result.officialRate}%
            </CyberMetric>
            <CyberSubHeader className="mt-2">TỔNG CỤC THỐNG KÊ</CyberSubHeader>
          </CyberCard>
        </motion.div>

        {/* Ratio Alert */}
        {result.isHigher && (
          <motion.div variants={fadeIn}>
            <CyberCard className="p-4 mb-6 border-[#EF4444]/20" variant="danger" showDecorators={false}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center shrink-0 border border-[#EF4444]/20">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                </div>
                <div>
                  <CyberHeader size="xs" className="text-[#EF4444]">Ảnh hưởng gấp {result.ratio}x!</CyberHeader>
                  <p className="text-xs text-white/50 mt-1 font-mono uppercase leading-relaxed">
                    Chi tiêu của bạn tập trung vào danh mục có lạm phát cao (nhà ở, ăn uống). Lãi suất tiết kiệm 5.2% có thể không đủ bù lại mức trượt giá thực tế.
                  </p>
                </div>
              </div>
            </CyberCard>
          </motion.div>
        )}

        {/* Vẹt Vàng Insights */}
        <motion.div variants={fadeIn}>
          <CyberCard className="p-5 mb-6" variant="success">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🦜</span>
              <CyberHeader size="sm" className="text-[#22C55E]">Vẹt Vàng Insight</CyberHeader>
            </div>

            <div className="space-y-4">
              {result.personalRate > 5.2 ? (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center text-[10px] font-black shrink-0 border border-[#EF4444]/20">01</div>
                  <p className="text-xs text-white/70 font-mono uppercase leading-relaxed">
                    Lãi suất <strong className="text-white">5.2%</strong> &lt; lạm phát của bạn <strong className="text-[#EF4444]">{result.personalRate}%</strong>. Tiền mặt đang <strong className="text-[#EF4444]">mất giá thực</strong>.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center text-[10px] font-black shrink-0 border border-[#22C55E]/20">01</div>
                  <p className="text-xs text-white/70 font-mono uppercase leading-relaxed">
                    Lãi suất <strong className="text-[#22C55E]">5.2%</strong> &gt; lạm phát của bạn <strong className="text-white">{result.personalRate}%</strong>. Giá trị tài sản vẫn duy trì tốt.
                  </p>
                </div>
              )}

              {result.personalRate > 5.2 && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center text-[10px] font-black shrink-0 border border-[#22C55E]/20">02</div>
                  <p className="text-xs text-white/70 font-mono uppercase leading-relaxed">
                    Cân nhắc chuyển dịch sang tài sản chống lạm phát như <strong className="text-white">Vàng, Chứng khoán</strong> hoặc <strong className="text-white">BĐS</strong>.
                  </p>
                </div>
              )}

              {(() => {
                const sorted = [...result.categories].sort((a, b) => b.contribution - a.contribution);
                const top = sorted[0];
                if (!top || top.contribution < result.personalRate * 0.3) return null;
                const pct = ((top.contribution / result.personalRate) * 100).toFixed(0);
                return (
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-[#AB47BC]/20 text-[#AB47BC] flex items-center justify-center text-[10px] font-black shrink-0 border border-[#AB47BC]/20">{result.personalRate > 5.2 ? "03" : "02"}</div>
                    <p className="text-xs text-white/70 font-mono uppercase leading-relaxed">
                      <strong className="text-white">{top.emoji} {top.name}</strong> chiếm <strong className="text-[#AB47BC]">{pct}%</strong> lạm phát của bạn. Hãy tìm giải pháp thay thế tiết kiệm hơn.
                    </p>
                  </div>
                );
              })()}
            </div>
          </CyberCard>
        </motion.div>

        {/* Sliders Container */}
        <motion.div variants={fadeIn}>
          <CyberCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#22C55E]" />
                <CyberHeader size="xs">Trọng số chi tiêu</CyberHeader>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={importFromBudget}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border",
                    imported ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30" : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                  )}
                >
                  <Download className="w-3 h-3" />
                  {imported ? "Đã nhập" : "Nhập dữ liệu"}
                </button>
                <button
                  onClick={() => {
                    const init: Record<string, number> = {};
                    CPI_CATEGORIES.forEach((c) => { init[c.id] = c.officialWeight; });
                    setWeights(init);
                    setImported(false);
                  }}
                  className="text-[10px] font-black uppercase text-white/20 hover:text-white/40 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-x-12 gap-y-6 mb-8">
              {CPI_CATEGORIES.map((cat) => {
                const w = weights[cat.id] || 0;
                const catResult = result.categories.find((c) => c.name === cat.name);
                return (
                  <div key={cat.id} className="group/slider">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg grayscale group-hover/slider:grayscale-0 transition-all">{cat.emoji}</span>
                        <CyberTypography size="xs" className="text-white/80">{cat.name}</CyberTypography>
                      </div>
                      <div className="text-right">
                        <CyberMetric size="xs" className="block text-white">{catResult?.userWeight.toFixed(0)}%</CyberMetric>
                        <CyberSubHeader className="block">GSO: {cat.officialWeight}%</CyberSubHeader>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={1}
                      value={w}
                      onChange={(e) => handleSlider(cat.id, Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-white/5 cursor-pointer accent-[#22C55E] hover:bg-white/10 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22C55E] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    />
                  </div>
                );
              })}
            </div>

            {/* Contribution Progress Bars */}
            <div className="mt-8 pt-8 border-t border-white/[0.04]">
              <CyberSubHeader className="mb-4 block">ĐÓNG GÓP VÀO LẠM PHÁT CÁ NHÂN</CyberSubHeader>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {result.categories
                  .sort((a, b) => b.contribution - a.contribution)
                  .map((cat) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-sm w-6">{cat.emoji}</span>
                      <CyberTypography size="xs" className="w-24 text-white/40 truncate">{cat.name}</CyberTypography>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                          style={{ width: `${(cat.contribution / result.personalRate) * 100}%` }}
                        />
                      </div>
                      <CyberTypography size="xs" variant="mono" className="text-white/30 w-12 text-right">{cat.contribution.toFixed(2)}%</CyberTypography>
                    </div>
                  ))}
              </div>
            </div>
          </CyberCard>
        </motion.div>
      </motion.div>
    </RequireTier>
  );
}
