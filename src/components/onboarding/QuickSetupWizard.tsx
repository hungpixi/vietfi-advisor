"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Wallet, CreditCard, Brain, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { completeOnboarding, generateBudgetPots } from "@/lib/onboarding-state";
import { getCachedUserId, saveBudgetPots, saveIncome } from "@/lib/supabase/user-data";

interface QuickSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

const INCOME_CHIPS = [
  { label: "5 triệu", value: 5000000 },
  { label: "8 triệu", value: 8000000 },
  { label: "12 triệu", value: 12000000 },
  { label: "15 triệu", value: 15000000 },
  { label: "20 triệu", value: 20000000 },
  { label: "30 triệu", value: 30000000 },
];

const RISK_QUESTIONS = [
  {
    q: "Thị trường giảm 20%, bạn sẽ?",
    options: [
      { label: "Bán hết, bảo toàn vốn", score: 0 },
      { label: "Giữ nguyên, chờ hồi", score: 1 },
      { label: "Mua thêm, đây là cơ hội!", score: 2 },
    ],
  },
  {
    q: "Bạn thích kiểu đầu tư nào?",
    options: [
      { label: "An toàn, lãi 5-6%/năm", score: 0 },
      { label: "Cân bằng, lãi 8-12%/năm", score: 1 },
      { label: "Rủi ro cao, lãi 15%+/năm", score: 2 },
    ],
  },
  {
    q: "Nếu được 100 triệu, bạn sẽ?",
    options: [
      { label: "Gửi tiết kiệm ngân hàng", score: 0 },
      { label: "Chia đều cổ phiếu + vàng + tiết kiệm", score: 1 },
      { label: "All-in cổ phiếu hoặc crypto", score: 2 },
    ],
  },
];

function formatVND(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(0)} triệu`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

export default function QuickSetupWizard({ onComplete, onSkip }: QuickSetupProps) {
  const [step, setStep] = useState(0); // 0=income, 1=debt, 2=risk, 3=done
  const [income, setIncome] = useState(0);
  const [customIncome, setCustomIncome] = useState("");
  const [hasDebt, setHasDebt] = useState<boolean | null>(null);
  const [riskAnswers, setRiskAnswers] = useState<number[]>([]);

  const totalSteps = 3;

  // Auto-redirect after celebration
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => onComplete(), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  const handleIncomeNext = () => {
    const finalIncome = income || Number(customIncome) || 12000000;
    setIncome(finalIncome);
    setStep(1);
  };

  const handleDebtNext = () => {
    setStep(2);
  };

  const handleComplete = () => {
    const totalScore = riskAnswers.reduce((s, a) => s + a, 0);
    const riskProfile = totalScore <= 2 ? "conservative" : totalScore <= 4 ? "balanced" : "growth";
    const finalIncome = income || 12000000;

    // Save onboarding data
    completeOnboarding({
      income: finalIncome,
      hasDebt: hasDebt || false,
      riskProfile,
    });

    // Generate budget pots from income
    const pots = generateBudgetPots(finalIncome);
    localStorage.setItem("vietfi_pots", JSON.stringify(pots));
    localStorage.setItem("vietfi_income", finalIncome.toString());
    localStorage.setItem("vietfi_expenses", JSON.stringify([]));

    // Clear demo debts if no debt
    if (!hasDebt) {
      localStorage.setItem("vietfi_debts", JSON.stringify([]));
    }

    // Background sync to Supabase if logged in
    if (getCachedUserId()) {
      saveBudgetPots(pots.map((p, i) => ({ ...p, iconKey: p.iconKey, sort_order: i }))).catch(() => {});
      saveIncome(finalIncome).catch(() => {});
    }

    setStep(3); // Show celebration
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1, transition: { duration: 0.3 } },
    exit: { x: -40, opacity: 0, transition: { duration: 0.2 } },
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg glass-card p-6 relative overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#E6B84F]/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Skip button */}
        <button onClick={onSkip} className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 relative z-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: i < step ? "100%" : i === step ? "50%" : "0%",
                  backgroundColor: "#E6B84F",
                }}
              />
            </div>
          ))}
          <span className="text-[10px] text-white/20 font-mono ml-2">{step + 1}/{totalSteps}</span>
        </div>

        <AnimatePresence mode="wait">
          {/* ═══ Step 0: Thu nhập ═══ */}
          {step === 0 && (
            <motion.div key="income" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#E6B84F]/15 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[#E6B84F]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Thu nhập hàng tháng</h2>
                  <p className="text-[11px] text-white/30">Để tự động chia 6 lọ chi tiêu cho bạn</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {INCOME_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => { setIncome(chip.value); setCustomIncome(""); }}
                    className={`py-2.5 px-3 text-xs rounded-lg border transition-all ${
                      income === chip.value
                        ? "bg-[#E6B84F]/15 text-[#E6B84F] border-[#E6B84F]/30 shadow-[0_0_12px_rgba(230,184,79,0.1)]"
                        : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:border-white/10"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <input
                  type="number"
                  placeholder="Hoặc nhập số khác..."
                  value={customIncome}
                  onChange={(e) => { setCustomIncome(e.target.value); setIncome(0); }}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#E6B84F]/30"
                />
              </div>

              {(income > 0 || Number(customIncome) > 0) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 p-3 bg-white/[0.02] rounded-lg"
                >
                  <p className="text-[11px] text-white/30 mb-2">VietFi sẽ tự chia cho bạn:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {generateBudgetPots(income || Number(customIncome)).slice(0, 4).map((pot) => (
                      <div key={pot.id} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pot.color }} />
                        <span className="text-[10px] text-white/40">{pot.name}: {formatVND(pot.allocated)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleIncomeNext}
                disabled={!income && !customIncome}
                className="w-full py-2.5 bg-gradient-primary text-black text-xs font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(230,184,79,0.2)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                Tiếp theo <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* ═══ Step 1: Nợ ═══ */}
          {step === 1 && (
            <motion.div key="debt" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#EF4444]/15 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#EF4444]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Bạn đang có khoản nợ nào?</h2>
                  <p className="text-[11px] text-white/30">Thẻ tín dụng, SPayLater, vay bạn bè...</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setHasDebt(true)}
                  className={`py-6 rounded-lg border text-center transition-all ${
                    hasDebt === true
                      ? "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:border-white/10"
                  }`}
                >
                  <div className="text-2xl mb-1">😰</div>
                  <span className="text-xs font-medium">Có, đang nợ</span>
                </button>
                <button
                  onClick={() => setHasDebt(false)}
                  className={`py-6 rounded-lg border text-center transition-all ${
                    hasDebt === false
                      ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:border-white/10"
                  }`}
                >
                  <div className="text-2xl mb-1">🎉</div>
                  <span className="text-xs font-medium">Không, sạch nợ!</span>
                </button>
              </div>

              {hasDebt === false && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-[#22C55E] mb-4 text-center"
                >
                  Tuyệt vời! Bạn có thể thêm nợ sau nếu cần ở trang Quỹ Nợ.
                </motion.p>
              )}

              {hasDebt === true && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-white/30 mb-4 text-center"
                >
                  Đừng lo, bạn có thể nhập chi tiết ở trang Quỹ Nợ sau. Giờ VietFi biết bạn cần hỗ trợ!
                </motion.p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep(0)} className="px-4 py-2.5 text-xs text-white/40 hover:text-white/60 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Quay lại
                </button>
                <button
                  onClick={handleDebtNext}
                  disabled={hasDebt === null}
                  className="flex-1 py-2.5 bg-gradient-primary text-black text-xs font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(230,184,79,0.2)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  Tiếp theo <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 2: Risk Profile (3 câu rút gọn) ═══ */}
          {step === 2 && (
            <motion.div key="risk" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#AB47BC]/15 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-[#AB47BC]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Tính cách đầu tư</h2>
                  <p className="text-[11px] text-white/30">3 câu hỏi nhanh → AI gợi ý danh mục phù hợp</p>
                </div>
              </div>

              <div className="space-y-4 mb-5">
                {RISK_QUESTIONS.map((rq, qi) => (
                  <div key={qi}>
                    <p className="text-xs text-white/60 mb-2 font-medium">
                      {qi + 1}. {rq.q}
                    </p>
                    <div className="space-y-1.5">
                      {rq.options.map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() => {
                            const newAnswers = [...riskAnswers];
                            newAnswers[qi] = opt.score;
                            setRiskAnswers(newAnswers);
                          }}
                          className={`w-full text-left px-3 py-2 text-[11px] rounded-lg border transition-all ${
                            riskAnswers[qi] === opt.score
                              ? "bg-[#AB47BC]/10 border-[#AB47BC]/30 text-[#AB47BC]"
                              : "bg-white/[0.02] border-white/[0.04] text-white/40 hover:border-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {riskAnswers.length === 3 && riskAnswers.every((a) => a !== undefined) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 p-3 bg-white/[0.02] rounded-lg flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#E6B84F]" />
                  <span className="text-xs text-white/50">
                    Tính cách: <strong className="text-white/80">
                      {riskAnswers.reduce((s, a) => s + a, 0) <= 2
                        ? "🛡️ Bảo thủ"
                        : riskAnswers.reduce((s, a) => s + a, 0) <= 4
                        ? "⚖️ Cân bằng"
                        : "🚀 Tăng trưởng"}
                    </strong>
                  </span>
                </motion.div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 text-xs text-white/40 hover:text-white/60 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Quay lại
                </button>
                <button
                  onClick={handleComplete}
                  disabled={riskAnswers.length < 3 || riskAnswers.some((a) => a === undefined)}
                  className="flex-1 py-2.5 bg-[#22C55E] text-black text-xs font-semibold rounded-lg hover:bg-[#22C55E]/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Hoàn tất setup!
                </button>
              </div>
            </motion.div>
          )}
          {/* ═══ Step 3: Celebration ═══ */}
          {step === 3 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="text-center py-8"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-lg font-bold text-white mb-2">Chào mừng bạn!</h2>
              <p className="text-sm text-white/40 mb-4">Dashboard đã sẵn sàng với dữ liệu của bạn</p>
              <div className="flex justify-center gap-1">
                {['🟡', '🟢', '🔵', '🟣', '🟠'].map((e, i) => (
                  <motion.span
                    key={i}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="text-lg"
                  >
                    {e}
                  </motion.span>
                ))}
              </div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear" }}
                className="h-1 bg-[#22C55E] rounded-full mt-6 mx-auto max-w-[200px]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
