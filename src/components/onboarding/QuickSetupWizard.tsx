"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Brain, X, Landmark, TrendingUp, CreditCard, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { completeOnboarding, generateBudgetPots } from "@/lib/onboarding-state";
import { getCachedUserId, saveBudgetPots, saveIncome } from "@/lib/supabase/user-data";
import { setBudgetPots, setExpenses, setIncome as setIncomeStorage, setDebts, setRiskResult } from "@/lib/storage";
import type { BudgetPot } from "@/lib/domain/personal-finance/types";
import { calculateRiskProfile } from "@/lib/calculations/risk-scoring";
import { cn, formatNumber, parseNumber } from "@/lib/utils";

interface QuickSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

const NETWORTH_CHIPS = [
  { label: "50tr", value: 50000000 },
  { label: "100tr", value: 100000000 },
  { label: "500tr", value: 500000000 },
  { label: "1 tỷ", value: 1000000000 },
  { label: "2 tỷ", value: 2000000000 },
  { label: "5 tỷ", value: 5000000000 },
];

const INCOME_CHIPS = [
  { label: "5tr", value: 5000000 },
  { label: "10tr", value: 10000000 },
  { label: "15tr", value: 15000000 },
  { label: "20tr", value: 20000000 },
  { label: "30tr", value: 30000000 },
  { label: "50tr", value: 50000000 },
];

const RISK_QUESTIONS = [
  {
    q: "Thị trường giảm 20%, bạn sẽ?",
    options: [
      { label: "Bán hết, bảo toàn vốn", score: 1 },
      { label: "Giữ nguyên, chờ hồi", score: 3 },
      { label: "Mua thêm, đây là cơ hội!", score: 5 },
    ],
  },
  {
    q: "Bạn thích kiểu đầu tư nào?",
    options: [
      { label: "An toàn, lãi 5-6%/năm", score: 1 },
      { label: "Cân bằng, lãi 8-12%/năm", score: 3 },
      { label: "Rủi rro cao, lãi 15%+/năm", score: 5 },
    ],
  },
  {
    q: "Nếu được 100 triệu, bạn sẽ?",
    options: [
      { label: "Gửi tiết kiệm ngân hàng", score: 1 },
      { label: "Chia đều cổ phiếu + vàng + tiết kiệm", score: 3 },
      { label: "All-in cổ phiếu hoặc crypto", score: 5 },
    ],
  },
];

function formatVND(n: number) {
  if (n >= 1000000000) return `${(n / 1000000000).toLocaleString()} tỷ`;
  if (n >= 1000000) return `${(n / 1000000).toLocaleString()} triệu`;
  if (n >= 1000) return `${(n / 1000).toLocaleString()}K`;
  return n.toLocaleString();
}

/* ─── Premium Components ─── */

function CornerDecor({ color = "green" }: { color?: string }) {
  const accentColor = color === "green" ? "border-[#22C55E]" : "border-white";
  return (
    <>
      <div className={cn("pointer-events-none absolute right-4 top-4 h-8 w-8 border-r border-t opacity-30", accentColor)} />
      <div className={cn("pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b border-l opacity-10", accentColor)} />
    </>
  );
}

function TechnicalGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:32px_32px]" />
  );
}

export default function QuickSetupWizard({ onComplete, onSkip }: QuickSetupProps) {
  const [step, setStep] = useState(0);
  const [netWorth, setNetWorth] = useState(0);
  const [customNetWorth, setCustomNetWorth] = useState("");
  const [income, setIncome] = useState(0);
  const [customIncome, setCustomIncome] = useState("");
  const [hasDebt, setHasDebt] = useState<boolean | null>(null);
  const [riskAnswers, setRiskAnswers] = useState<number[]>([]);

  const totalSteps = 4;
  const selectedNetWorth = netWorth || parseNumber(customNetWorth) || 0;
  const selectedIncome = income || parseNumber(customIncome) || 0;

  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => onComplete(), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  const handleNetWorthChip = (val: number) => {
    setNetWorth(val);
    setCustomNetWorth(formatNumber(val));
  };

  const handleCustomNetWorth = (val: string) => {
    setCustomNetWorth(formatNumber(val));
    setNetWorth(0);
  };

  const handleIncomeChip = (val: number) => {
    setIncome(val);
    setCustomIncome(formatNumber(val));
  };

  const handleCustomIncome = (val: string) => {
    setCustomIncome(formatNumber(val));
    setIncome(0);
  };

  const handleNetWorthNext = () => {
    if (selectedNetWorth <= 0) return;
    setStep(1);
  };

  const handleIncomeNext = () => {
    if (selectedIncome <= 0) return;
    setStep(2);
  };

  const handleDebtSelection = (val: boolean) => {
    setHasDebt(val);
    setTimeout(() => setStep(3), 600);
  };

  const handleRiskAnswer = (qIdx: number, score: number) => {
    const newAnswers = [...riskAnswers];
    newAnswers[qIdx] = score;
    setRiskAnswers(newAnswers);
    if (qIdx === 2) {
      setTimeout(() => handleComplete(newAnswers), 800);
    }
  };

  const handleComplete = (finalRiskAnswers = riskAnswers) => {
    const riskResult = calculateRiskProfile(finalRiskAnswers);
    const riskProfile = riskResult.type;

    completeOnboarding({
      netWorth: selectedNetWorth,
      income: selectedIncome,
      hasDebt: hasDebt || false,
      riskProfile,
    });

    setRiskResult(riskResult);
    setBudgetPots([]);
    setIncomeStorage(selectedIncome);
    setExpenses([]);
    if (!hasDebt) setDebts([]);

    if (getCachedUserId()) {
      saveIncome(selectedIncome).catch(() => { });
    }

    setStep(4);
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: "circOut" } },
    exit: { x: -40, opacity: 0, transition: { duration: 0.3, ease: "circIn" } },
  } as const;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#08110f] border border-white/10 rounded-2xl shadow-[0_32px_120px_rgba(0,0,0,0.8)] p-6 sm:p-10 relative overflow-hidden group"
      >
        <TechnicalGrid />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.05),transparent_60%)]" />
        <CornerDecor color="green" />

        {/* Header with Exit and Progress */}
        <div className="relative z-10 flex flex-col gap-6 mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-hidden">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="w-20 h-[3px] rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: i < step ? "100%" : i === step ? "100%" : "0%" }}
                    className="h-full bg-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.3em] text-white/60">BƯỚC 0{step + 1}</span>
              <button onClick={onSkip} className="text-white/20 hover:text-white/60 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="networth" variants={slideVariants} initial="enter" animate="center" exit="exit" className="relative z-10">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-14 h-14 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
                  <Landmark className="w-7 h-7 text-[#22C55E]" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#22C55E] mb-1">THIẾT LẬP DANH MỤC</p>
                  <h2 className="font-heading text-2xl font-black uppercase text-white tracking-wider leading-none">TỔNG TÀI SẢN RÒNG</h2>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                {NETWORTH_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => handleNetWorthChip(chip.value)}
                    className={cn(
                      "py-3 rounded-lg border font-mono text-[10px] font-black uppercase tracking-widest transition-all",
                      netWorth === chip.value
                        ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                        : "bg-white/[0.02] text-white/70 border-white/[0.05] hover:border-white/20"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="mb-8 relative">
                  <input
                    type="text"
                    placeholder="0.00"
                    value={customNetWorth}
                    onChange={(e) => handleCustomNetWorth(e.target.value)}
                  className="w-full px-6 py-10 bg-black/40 border border-white/5 rounded-xl text-5xl font-black text-white placeholder:text-white/5 focus:outline-none focus:border-[#22C55E]/30 transition-all font-mono tracking-tighter"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 font-heading text-xl font-black text-white/10 tracking-widest uppercase">VND</div>
              </div>

              <AnimatePresence>
                {selectedNetWorth > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-8 p-8 bg-gradient-to-b from-[#22C55E]/5 to-transparent rounded-xl border border-white/5 text-center relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <p className="font-mono text-[11px] font-black uppercase tracking-[0.4em] text-[#22C55E]/80 mb-3">CHỈ SỐ TÀI SẢN HIỆN TẠI</p>
                      <div className="font-heading text-7xl font-black text-white leading-none tracking-tighter mb-4">
                        {formatVND(selectedNetWorth).toUpperCase()}
                      </div>
                      <div className="h-px w-20 bg-gradient-to-r from-transparent via-[#22C55E]/40 to-transparent mx-auto mb-4" />
                      <p className="text-[12px] text-white/70 uppercase font-black tracking-widest">Thiết lập điểm khởi đầu của bạn</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setStep(1)}
                disabled={selectedNetWorth <= 0}
                className="w-full py-5 bg-[#22C55E] text-black text-[12px] font-black rounded-lg shadow-[0_12px_40px_rgba(34,197,94,0.25)] transition-all active:scale-[0.98] disabled:opacity-10 flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
              >
                Tiếp tục <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="income" variants={slideVariants} initial="enter" animate="center" exit="exit" className="relative z-10">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-14 h-14 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-[#22C55E]" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#22C55E] mb-1">LƯU THÔNG DÒNG TIỀN</p>
                  <h2 className="font-heading text-2xl font-black uppercase text-white tracking-wider leading-none">THU NHẬP HÀNG THÁNG</h2>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                {INCOME_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => handleIncomeChip(chip.value)}
                    className={cn(
                      "py-3 rounded-lg border font-mono text-[10px] font-black uppercase tracking-widest transition-all",
                      income === chip.value
                        ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                        : "bg-white/[0.02] text-white/70 border-white/[0.05] hover:border-white/20"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="mb-8 relative">
                <input
                  type="text"
                  placeholder="0.00"
                  value={customIncome}
                  onChange={(e) => handleCustomIncome(e.target.value)}
                  className="w-full px-6 py-10 bg-black/40 border border-white/5 rounded-xl text-5xl font-black text-white placeholder:text-white/5 focus:outline-none focus:border-[#22C55E]/30 transition-all font-mono tracking-tighter"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 font-heading text-xl font-black text-white/10 tracking-widest uppercase">VND</div>
              </div>

              <AnimatePresence>
                {selectedIncome > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-8 p-8 bg-gradient-to-b from-[#22C55E]/5 to-transparent rounded-xl border border-white/5 text-center relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <p className="font-mono text-[11px] font-black uppercase tracking-[0.4em] text-[#22C55E]/80 mb-3">DÒNG TIỀN MỤC TIÊU</p>
                      <div className="font-heading text-7xl font-black text-white leading-none tracking-tighter mb-4">
                        {formatVND(selectedIncome).toUpperCase()}
                      </div>
                      <div className="h-px w-20 bg-gradient-to-r from-transparent via-[#22C55E]/40 to-transparent mx-auto mb-4" />
                      <p className="text-[12px] text-white/70 uppercase font-black tracking-widest">Ngân sách dự kiến</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4">
                <button onClick={() => setStep(0)} className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white/70">Quay lại</button>
                <button
                  onClick={handleIncomeNext}
                  disabled={selectedIncome <= 0}
                  className="flex-1 py-5 bg-[#22C55E] text-black text-[12px] font-black rounded-lg shadow-[0_12px_40px_rgba(34,197,94,0.25)] transition-all active:scale-[0.98] disabled:opacity-10 flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                >
                  Tiếp tục <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="debt" variants={slideVariants} initial="enter" animate="center" exit="exit" className="relative z-10">
              <div className="flex items-start gap-4 mb-10">
                <div className="w-14 h-14 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-[#EF4444]" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#EF4444] mb-1">NỢ & NGHĨA VỤ</p>
                  <h2 className="font-heading text-2xl font-black uppercase text-white tracking-wider leading-none">TÌNH TRẠNG NỢ</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <button
                  onClick={() => handleDebtSelection(true)}
                  className={cn(
                    "py-16 rounded-xl border transition-all",
                    hasDebt === true
                      ? "bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444] shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                      : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:border-white/20"
                  )}
                >
                  <div className="text-5xl mb-4">😰</div>
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em]">CÓ NỢ PHẢI TRẢ</div>
                </button>
                <button
                  onClick={() => handleDebtSelection(false)}
                  className={cn(
                    "py-16 rounded-xl border transition-all",
                    hasDebt === false
                      ? "bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E] shadow-[0_0_30px_rgba(34,197,94,0.1)]"
                      : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:border-white/20"
                  )}
                >
                  <div className="text-5xl mb-4">🛡️</div>
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em]">SẠCH NỢ HOÀN TOÀN</div>
                </button>
              </div>

              <button onClick={() => setStep(1)} className="flex items-center gap-2 mx-auto font-mono text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white/70 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="risk" variants={slideVariants} initial="enter" animate="center" exit="exit" className="relative z-10">
              <div className="flex items-start gap-4 mb-10">
                <div className="w-14 h-14 rounded-xl bg-[#AB47BC]/10 border border-[#AB47BC]/20 flex items-center justify-center">
                  <Brain className="w-7 h-7 text-[#AB47BC]" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#AB47BC] mb-1">KHẨU VỊ ĐẦU TƯ</p>
                  <h2 className="font-heading text-2xl font-black uppercase text-white tracking-wider leading-none">KHẨU VỊ RỦI RO</h2>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                {RISK_QUESTIONS.map((rq, qi) => {
                  const isHidden = riskAnswers[qi] === undefined && qi > 0 && riskAnswers[qi - 1] === undefined;
                  if (isHidden) return null;

                  return (
                    <motion.div key={qi} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <p className="font-mono text-[13px] font-black uppercase tracking-[0.1em] text-white/90">CÂU {qi + 1}: {rq.q}</p>
                      <div className="grid grid-cols-1 gap-2.5">
                        {rq.options.map((opt, oi) => (
                          <button
                            key={oi}
                            onClick={() => handleRiskAnswer(qi, opt.score)}
                            className={cn(
                              "w-full text-left px-5 py-4 rounded-xl border transition-all text-[14px] font-bold tracking-tight",
                              riskAnswers[qi] === opt.score
                                ? "bg-[#AB47BC]/20 border-[#AB47BC]/50 text-[#E1BEE7] shadow-[0_0_20px_rgba(171,71,188,0.2)]"
                                : "bg-white/[0.03] border-white/[0.08] text-white/80 hover:border-white/20 hover:bg-white/[0.05]"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4">
                <button onClick={() => setStep(2)} className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white/70">Quay lại</button>
                {riskAnswers.length === 3 && (
                  <button onClick={() => handleComplete()} className="flex-1 py-4 bg-[#22C55E] text-black text-[12px] font-black rounded-lg uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(34,197,94,0.2)]">
                    Hoàn tất phân tích
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 relative z-10">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-7xl mb-12"
              >
                ⚙️
              </motion.div>
              <h2 className="font-heading text-4xl font-black text-white uppercase tracking-tighter mb-4 italic">Hệ thống sẵn sàng</h2>
              <p className="font-mono text-[11px] font-black text-white/60 uppercase tracking-[0.4em] mb-12 italic">Đang chuẩn bị lộ trình...</p>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden max-w-[240px] mx-auto">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  className="h-full bg-[#22C55E]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
