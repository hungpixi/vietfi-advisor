"use client";

import { motion } from "framer-motion";
import { Calculator, AlertTriangle, Download } from "lucide-react";
import { useState } from "react";
import { CPI_CATEGORIES, calculatePersonalCPI } from "@/lib/calculations/personal-cpi";
import { getBudgetPots, getExpenses } from "@/lib/storage";
import RequireTier from "@/components/gamification/RequireTier";
import { UserRole } from "@/lib/rbac";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";
import { SmartWeightSlider } from "@/components/dashboard/SmartWeightSlider";
import { rebalanceWeights } from "@/lib/calculations/rebalance";

const BUDGET_TO_CPI: Record<string, string> = {
  "Ăn uống": "food",
  "Shopping": "other",
  "Đi lại": "transport",
  "Nhà ở": "housing",
  "Giải trí": "entertainment",
  "Sức khỏe": "healthcare",
  "Học tập": "education",
};

const PRESETS = [
  { name: "Mặc định GSO", icon: "📊", description: "Theo dữ liệu Tổng cục Thống kê 2025" },
  { name: "Tiết kiệm", icon: "🌱", description: "Cắt giảm tối đa giải trí và mua sắm" },
  { name: "Thành thị Pro", icon: "🏙️", description: "Chi phí nhà ở và đi lại cao hơn" },
  { name: "Sinh viên", icon: "🎓", description: "Tập trung vào giáo dục và ăn uống" },
];

const STRATEGY_WEIGHTS: Record<string, Record<string, number>> = {
  "Mặc định GSO": {
    food: 33.56, housing: 18.82, transport: 9.37, education: 6.17, healthcare: 5.04, entertainment: 4.29, other: 22.75
  },
  "Tiết kiệm": {
    food: 45, housing: 20, transport: 8, education: 5, healthcare: 5, entertainment: 2, other: 15
  },
  "Thành thị Pro": {
    food: 25, housing: 30, transport: 15, education: 5, healthcare: 5, entertainment: 8, other: 12
  },
  "Sinh viên": {
    food: 40, housing: 15, transport: 5, education: 20, healthcare: 3, entertainment: 5, other: 12
  }
};

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function PersonalCPIPage() {
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    CPI_CATEGORIES.forEach((c) => { init[c.id] = c.officialWeight; });
    return init;
  });
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState(false);

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
          newWeights[id] = (newWeights[id] / total) * 100;
        }
      }

      setWeights(newWeights);
      setImported(true);
    } catch { /* ignore */ }
  };

  const applyPreset = (name: string) => {
    const preset = STRATEGY_WEIGHTS[name];
    if (preset) {
      setWeights(preset);
      setImported(false);
      setLockedIds(new Set());
    }
  };

  const result = calculatePersonalCPI(weights);

  const handleSlider = (id: string, value: number) => {
    if (lockedIds.has(id)) return;
    const newWeights = rebalanceWeights(weights, id, value, lockedIds);
    setWeights(newWeights);
  };

  const toggleLock = (id: string) => {
    setLockedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <RequireTier requiredRole={UserRole.PRO} featureName="Lạm Phát Của Tôi">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeIn} className="mb-6">
          <CyberHeader size="display">Lạm phát <span className="text-[#22C55E]">của tôi</span></CyberHeader>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1 w-12 bg-[#22C55E]/50" />
            <CyberSubHeader className="text-[#22C55E] font-black tracking-[0.2em] uppercase">
              ĐIỀU CHỈNH & THEO DÕI TRƯỢT GIÁ THỰC TẾ
            </CyberSubHeader>
          </div>
        </motion.div>

        {/* Big Number Cards */}
        <motion.div variants={fadeIn} className="grid sm:grid-cols-2 gap-4 mb-8">
          <CyberCard className="p-6 text-center flex flex-col items-center justify-center min-h-[180px]" variant={result.isHigher ? "danger" : "success"}>
            <CyberHeader size="xs" className="text-white/40 mb-2">LẠM PHÁT CỦA BẠN</CyberHeader>
            <CyberMetric size="4xl" color={result.isHigher ? "text-[#EF4444]" : "text-[#22C55E]"} className="my-2 drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              {result.personalRate}%
            </CyberMetric>
            {result.isHigher && (
              <div className="flex items-center gap-2 mt-4 px-4 py-1.5 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                <span className="text-sm font-black text-[#EF4444] uppercase tracking-tighter">
                  +{(result.personalRate - result.officialRate).toFixed(1)}% SO VỚI CHÍNH THỨC
                </span>
              </div>
            )}
          </CyberCard>

          <CyberCard className="p-6 text-center flex flex-col items-center justify-center min-h-[180px]" showDecorators={false}>
            <CyberHeader size="xs" className="text-white/40 mb-2">CPI CHÍNH THỨC (GSO 2025)</CyberHeader>
            <CyberMetric size="4xl" color="text-white/60" className="my-2">
              {result.officialRate}%
            </CyberMetric>
            <div className="mt-4 px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-sm font-black text-white/30 uppercase tracking-widest">TỔNG CỤC THỐNG KÊ</span>
            </div>
          </CyberCard>
        </motion.div>

        {/* Ratio Alert */}
        {result.isHigher && (
          <motion.div variants={fadeIn}>
            <CyberCard className="p-6 mb-8 border-[#EF4444]/30" variant="danger" showDecorators={false}>
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/15 flex items-center justify-center shrink-0 border border-[#EF4444]/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <AlertTriangle className="w-7 h-7 text-[#EF4444]" />
                </div>
                <div>
                  <CyberHeader size="sm" className="text-[#EF4444] mb-2 !tracking-widest">ẢNH HƯỞNG GẤP {result.ratio}X!</CyberHeader>
                  <p className="text-[15px] md:text-[16px] text-white/80 font-mono uppercase leading-relaxed text-justify">
                    Chi tiêu của bạn tập trung vào danh mục có lạm phát cao (nhà ở, ăn uống). Lãi suất tiết kiệm 5.2% có thể không đủ bù lại mức trượt giá thực tế.
                  </p>
                </div>
              </div>
            </CyberCard>
          </motion.div>
        )}

        {/* Vẹt Vàng Insights */}
        <motion.div variants={fadeIn}>
          <CyberCard className="p-8 mb-8" variant="success">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-white/[0.05]">
              <span className="text-4xl animate-bounce">💡</span>
              <CyberHeader size="md" className="text-[#22C55E] !tracking-[0.2em]">NHẬN ĐỊNH THÔNG MINH</CyberHeader>
            </div>

            <div className="space-y-6">
              {result.personalRate > 5.2 ? (
                <div className="flex items-start gap-5">
                  <div className="w-8 h-8 rounded-lg bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center text-sm font-black shrink-0 border border-[#EF4444]/30">01</div>
                  <p className="text-[16px] text-white/80 font-mono uppercase leading-relaxed">
                    Lãi suất <strong className="text-white bg-white/10 px-1 rounded">5.2%</strong> &lt; lạm phát của bạn <strong className="text-[#EF4444] underline decoration-2 underline-offset-4">{result.personalRate}%</strong>. Tiền mặt đang <strong className="text-[#EF4444] font-black italic">mất giá thực</strong>.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-5">
                  <div className="w-8 h-8 rounded-lg bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center text-sm font-black shrink-0 border border-[#22C55E]/30">01</div>
                  <p className="text-[16px] text-white/80 font-mono uppercase leading-relaxed">
                    Lãi suất <strong className="text-[#22C55E]">5.2%</strong> &gt; lạm phát của bạn <strong className="text-white">{result.personalRate}%</strong>. Giá trị tài sản vẫn duy trì tốt.
                  </p>
                </div>
              )}

              {result.personalRate > 5.2 && (
                <div className="flex items-start gap-5">
                  <div className="w-8 h-8 rounded-lg bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center text-sm font-black shrink-0 border border-[#22C55E]/30">02</div>
                  <p className="text-[16px] text-white/80 font-mono uppercase leading-relaxed text-justify">
                    Cân nhắc chuyển dịch sang tài sản chống lạm phát như <strong className="text-white border-b border-white/40">Vàng, Chứng khoán</strong> hoặc <strong className="text-white border-b border-white/40">BĐS</strong>.
                  </p>
                </div>
              )}

              {(() => {
                const sorted = [...result.categories].sort((a, b) => b.contribution - a.contribution);
                const top = sorted[0];
                if (!top || top.contribution < result.personalRate * 0.3) return null;
                const pct = ((top.contribution / result.personalRate) * 100).toFixed(0);
                return (
                  <div className="flex items-start gap-5">
                    <div className="w-8 h-8 rounded-lg bg-[#AB47BC]/20 text-[#AB47BC] flex items-center justify-center text-sm font-black shrink-0 border border-[#AB47BC]/30">{result.personalRate > 5.2 ? "03" : "02"}</div>
                    <p className="text-[16px] text-white/80 font-mono uppercase leading-relaxed">
                      <strong className="text-white text-lg">{top.emoji} {top.name}</strong> chiếm <strong className="text-[#AB47BC] font-black underline decoration-2 underline-offset-4">{pct}%</strong> lạm phát của bạn. Hãy tìm giải pháp tiết kiệm hơn.
                    </p>
                  </div>
                );
              })()}
            </div>
          </CyberCard>
        </motion.div>

        {/* Strategy Presets */}
        <motion.div variants={fadeIn} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.name)}
              className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-[#22C55E]/50 transition-all text-left group relative overflow-hidden"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">{preset.icon}</div>
              <div className="text-[13px] font-black uppercase text-white mb-2 tracking-widest leading-none">{preset.name}</div>
              <div className="text-[11px] text-white/40 uppercase leading-relaxed font-mono">{preset.description}</div>
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              </div>
            </button>
          ))}
        </motion.div>

        {/* Sliders Container */}
        <motion.div variants={fadeIn}>
          <CyberCard className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30">
                  <Calculator className="w-6 h-6 text-[#22C55E]" />
                </div>
                <CyberHeader size="sm" className="!tracking-widest">TRỌNG SỐ CHI TIÊU (TỔNG: 100%)</CyberHeader>
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
                  {imported ? "Dữ liệu thực" : "Nhập dữ liệu"}
                </button>
                <button
                  onClick={() => {
                    const init: Record<string, number> = {};
                    CPI_CATEGORIES.forEach((c) => { init[c.id] = c.officialWeight; });
                    setWeights(init);
                    setImported(false);
                    setLockedIds(new Set());
                  }}
                  className="text-[10px] font-black uppercase text-white/20 hover:text-white/40 transition-colors"
                >
                  Mặc định
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {CPI_CATEGORIES.map((cat) => (
                <SmartWeightSlider
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  emoji={cat.emoji}
                  value={weights[cat.id] || 0}
                  officialWeight={cat.officialWeight}
                  isLocked={lockedIds.has(cat.id)}
                  onValueChange={handleSlider}
                  onLockToggle={toggleLock}
                />
              ))}
            </div>

            {/* Contribution Progress Bars */}
            <div className="mt-12 pt-10 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 mb-8 ml-1">
                <div className="h-4 w-1 bg-[#AB47BC]" />
                <CyberHeader size="sm" className="!tracking-[0.2em] text-white/90">ĐÓNG GÓP VÀO LẠM PHÁT CÁ NHÂN</CyberHeader>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {result.categories
                  .sort((a, b) => b.contribution - a.contribution)
                  .map((cat, idx) => {
                    const ratio = (cat.contribution / result.personalRate) * 100;
                    const isTop = idx < 2 && ratio > 20;

                    return (
                      <div key={cat.name} className={cn(
                        "group flex items-center gap-4 p-3 rounded-xl border transition-all duration-300",
                        isTop ? "bg-[#AB47BC]/5 border-[#AB47BC]/20" : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      )}>
                        <div className="text-2xl w-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {cat.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <CyberTypography size="sm" className={cn(
                              "font-black uppercase tracking-tight truncate",
                              isTop ? "text-white" : "text-white/60"
                            )}>
                              {cat.name}
                            </CyberTypography>
                            <CyberTypography size="sm" variant="mono" className={cn(
                              "font-black",
                              isTop ? "text-[#AB47BC]" : "text-white/40"
                            )}>
                              {cat.contribution.toFixed(2)}%
                            </CyberTypography>
                          </div>

                          <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div
                              className={cn(
                                "h-full rounded-full relative z-10",
                                isTop ? "bg-gradient-to-r from-[#AB47BC] to-[#E1BEE7]" : "bg-[#22C55E]/60"
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${ratio}%` }}
                              transition={{ duration: 1, ease: "circOut" }}
                            />
                            {/* Glow effect for top contributors */}
                            {isTop && (
                              <motion.div
                                className="absolute inset-0 bg-[#AB47BC]/30 blur-sm z-0"
                                initial={{ width: 0 }}
                                animate={{ width: `${ratio}%` }}
                                transition={{ duration: 1, ease: "circOut" }}
                              />
                            )}
                          </div>
                        </div>

                        <div className="hidden lg:block w-12 text-right">
                          <span className="text-[10px] font-mono text-white/20 uppercase">Tỷ lệ</span>
                          <div className="text-[11px] font-mono text-white/40 font-bold">{ratio.toFixed(0)}%</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </CyberCard>
        </motion.div>
      </motion.div>
    </RequireTier>
  );
}
