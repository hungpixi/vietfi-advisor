"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Wallet, CreditCard, Brain, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { completeOnboarding, generateBudgetPots } from "@/lib/onboarding-state";
import { getCachedUserId, saveBudgetPots, saveIncome } from "@/lib/supabase/user-data";
import { setBudgetPots, setExpenses, setIncome, setDebts } from "@/lib/storage";

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

interface BudgetPot {
  id: string;
  name: string;
  iconKey: string;
  allocated: number;
  color: string;
}

const FAST_STEP = 100000; // 0.1tr

function buildPreset4Pots(income: number): BudgetPot[] {
  const foodShopping = Math.round(income * 0.35);
  const transportHousing = Math.round(income * 0.33);
  const funHealth = Math.round(income * 0.15);
  const studySaving = income - foodShopping - transportHousing - funHealth;
  return [
    { id: "g1", name: "Ăn + Shopping", iconKey: "Coffee", allocated: foodShopping, color: "#FF6B35" },
    { id: "g2", name: "Đi lại + Nhà", iconKey: "Home", allocated: transportHousing, color: "#22C55E" },
    { id: "g3", name: "Giải trí + Sức khỏe", iconKey: "Heart", allocated: funHealth, color: "#E6B84F" },
    { id: "g4", name: "Học + Tiết kiệm", iconKey: "GraduationCap", allocated: studySaving, color: "#3ECF8E" },
  ];
}

export default function QuickSetupWizard({ onComplete, onSkip }: QuickSetupProps) {
  const [step, setStep] = useState(0); // 0=income, 1=debt, 2=risk, 3=done
  const [income, setIncome] = useState(0);
  const [customIncome, setCustomIncome] = useState("");
  const [pots, setPots] = useState<BudgetPot[]>(() => generateBudgetPots(12000000));
  const [potMode, setPotMode] = useState<"8" | "4">("8");
  const [activePotId, setActivePotId] = useState<string>("1");
  const [stepIncrement, setStepIncrement] = useState<number>(FAST_STEP);
  const [hasDebt, setHasDebt] = useState<boolean | null>(null);
  const [riskAnswers, setRiskAnswers] = useState<number[]>([]);

  const totalSteps = 3;

  const selectedIncome = income || Number(customIncome) || 0;
  const totalAllocated = pots.reduce((s, p) => s + p.allocated, 0);
  const remaining = selectedIncome - totalAllocated;
  const allocationValid = selectedIncome > 0 && Math.abs(remaining) <= 1;
  const activePot = pots.find((p) => p.id === activePotId) || pots[0];

  // Auto-redirect after celebration
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => onComplete(), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  const applyPotsByMode = (nextIncome: number, nextMode: "8" | "4") => {
    if (!nextIncome) return;
    const nextPots = nextMode === "8" ? generateBudgetPots(nextIncome) : buildPreset4Pots(nextIncome);
    setPots(nextPots);
    setActivePotId(nextPots[0]?.id ?? "");
  };

  const handleIncomeChip = (chipValue: number) => {
    setIncome(chipValue);
    setCustomIncome("");
    applyPotsByMode(chipValue, potMode);
  };

  const handleCustomIncome = (raw: string) => {
    setCustomIncome(raw);
    setIncome(0);
    const parsed = Number(raw);
    if (parsed > 0) {
      applyPotsByMode(parsed, potMode);
    }
  };

  const handlePotModeChange = (mode: "8" | "4") => {
    setPotMode(mode);
    const nextIncome = selectedIncome || 12000000;
    applyPotsByMode(nextIncome, mode);
  };

  const handleIncomeNext = () => {
    if (!selectedIncome) return;
    const finalIncome = selectedIncome;
    setIncome(finalIncome);
    setStep(1);
  };

  const handleDebtNext = () => {
    setStep(2);
  };

  const handlePotChange = (id: string, value: number) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) return;
    setPots((prev) => prev.map((pot) => (pot.id === id ? { ...pot, allocated: parsed } : pot)));
  };

  const adjustPot = (id: string, delta: number) => {
    setPots((prev) =>
      prev.map((pot) => {
        if (pot.id !== id) return pot;
        const next = Math.max(0, pot.allocated + delta);
        return { ...pot, allocated: next };
      })
    );
  };

  const fillRemaining = () => {
    if (!activePot) return;
    setPots((prev) => {
      const total = prev.reduce((sum, p) => sum + p.allocated, 0);
      const rem = selectedIncome - total;
      return prev.map((pot) => {
        if (pot.id !== activePot.id) return pot;
        return { ...pot, allocated: Math.max(0, pot.allocated + rem) };
      });
    });
  };

  const autoFitTotal = () => {
    setPots((prev) => {
      if (!prev.length) return prev;
      const prioritizedIds = [activePot?.id, ...prev.map((p) => p.id)].filter((id): id is string => Boolean(id));
      let rem = selectedIncome - prev.reduce((sum, p) => sum + p.allocated, 0);
      if (rem === 0) return prev;

      const next = [...prev];

      // Reduce first when over budget; add to active first when under budget.
      for (const id of prioritizedIds) {
        if (rem === 0) break;
        const idx = next.findIndex((p) => p.id === id);
        if (idx < 0) continue;

        if (rem > 0) {
          next[idx] = { ...next[idx], allocated: next[idx].allocated + rem };
          rem = 0;
          break;
        }

        const canTake = Math.min(next[idx].allocated, Math.abs(rem));
        if (canTake > 0) {
          next[idx] = { ...next[idx], allocated: next[idx].allocated - canTake };
          rem += canTake;
        }
      }

      return next;
    });
  };

  const handleComplete = () => {
    const totalScore = riskAnswers.reduce((s, a) => s + a, 0);
    const riskProfile = totalScore <= 2 ? "conservative" : totalScore <= 4 ? "balanced" : "growth";
    const finalIncome = selectedIncome || 12000000;

    // Save onboarding data
    completeOnboarding({
      income: finalIncome,
      hasDebt: hasDebt || false,
      riskProfile,
    });

    // Use user-adjusted pots if available, otherwise fallback
    const finalPots = pots.length && allocationValid ? pots : generateBudgetPots(finalIncome);
    setBudgetPots(finalPots);
    setIncome(finalIncome);
    setExpenses([]);

    // Clear demo debts if no debt
    if (!hasDebt) {
      setDebts([]);
    }

    // Background sync to Supabase if logged in
    if (getCachedUserId()) {
      saveBudgetPots(finalPots.map((p, i) => ({ ...p, iconKey: p.iconKey, sort_order: i }))).catch(() => {});
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
        className="w-full max-w-2xl glass-card p-8 relative overflow-hidden"
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
          <span className="text-[10px] text-white/20 font-mono ml-2">{Math.min(step + 1, totalSteps)}/{totalSteps}</span>
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
                  <h2 className="text-lg font-bold text-white">Thu nhập hàng tháng</h2>
                  <p className="text-sm text-white/40">Setup nhanh: chọn 4 hũ hoặc 8 hũ, chỉnh từng hũ theo nhu cầu.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {INCOME_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => handleIncomeChip(chip.value)}
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
                  onChange={(e) => handleCustomIncome(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#E6B84F]/30"
                />
              </div>

              {selectedIncome > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.08]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-white/70">Preset hũ:</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePotModeChange("8")}
                        className={`px-2 py-1 rounded-md ${potMode === "8" ? "bg-[#E6B84F]/20 text-[#E6B84F]" : "bg-white/[0.08] text-white/70"}`}
                      >
                        8 hũ
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePotModeChange("4")}
                        className={`px-2 py-1 rounded-md ${potMode === "4" ? "bg-[#E6B84F]/20 text-[#E6B84F]" : "bg-white/[0.08] text-white/70"}`}
                      >
                        4 hũ
                      </button>
                    </div>
                  </div>

                  <div className="mb-2 text-sm text-white/70">Chọn 1 hũ để chỉnh nhanh (không cần sửa cả danh sách):</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {pots.map((pot) => (
                      <button
                        key={pot.id}
                        type="button"
                        onClick={() => setActivePotId(pot.id)}
                        className={`p-2 rounded-lg border text-left ${activePot?.id === pot.id ? "bg-[#E6B84F]/12 border-[#E6B84F]/35" : "bg-white/[0.02] border-white/[0.08]"}`}
                      >
                        <div className="text-xs text-white/80 truncate">{pot.name}</div>
                        <div className="text-[11px] text-white/60">{formatVND(pot.allocated)}</div>
                      </button>
                    ))}
                  </div>

                  {activePot && (
                    <div className="p-3 rounded-lg bg-black/20 border border-white/[0.08] mb-3">
                      <div className="text-xs text-white/60 mb-2">Đang chỉnh: <span className="text-white/90 font-medium">{activePot.name}</span></div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-xs text-white/50">Step:</label>
                        {[100000, 500000, 1000000].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setStepIncrement(step)}
                            className={`px-2 py-1 rounded-md ${stepIncrement === step ? "bg-[#E6B84F]/25 text-[#E6B84F]" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.12]"}`}
                          >
                            {step === 100000 ? "+0.1tr" : step === 500000 ? "+0.5tr" : "+1tr"}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => adjustPot(activePot.id, -stepIncrement)}
                          className="px-3 py-1 rounded-md bg-white/[0.06] text-white/80 hover:bg-white/[0.12]"
                        >
                          -{stepIncrement / 100000}tr
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustPot(activePot.id, stepIncrement)}
                          className="px-3 py-1 rounded-md bg-white/[0.06] text-white/80 hover:bg-white/[0.12]"
                        >
                          +{stepIncrement / 100000}tr
                        </button>
                        <input
                          type="number"
                          className="ml-auto w-40 px-2 py-1 rounded-md bg-white/[0.04] text-white text-sm border border-white/[0.08]"
                          value={activePot.allocated}
                          min={0}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") return;
                            handlePotChange(activePot.id, Number(raw));
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-white/50">{((activePot.allocated / selectedIncome) * 100).toFixed(1)}% của thu nhập</div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-white/70">Tổng phân bổ: {formatVND(totalAllocated)}</span>
                    <span className={allocationValid ? "text-emerald-200" : "text-rose-200"}>
                      {allocationValid ? "Đã khớp" : "Chưa khớp"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                    <span>Còn lại: {formatVND(remaining)}</span>
                    {remaining !== 0 && (
                      <button
                        onClick={fillRemaining}
                        type="button"
                        className="px-2 py-1 rounded-md bg-[#E6B84F]/20 text-[#E6B84F] hover:bg-[#E6B84F]/30"
                      >
                        Dồn vào hũ đang chỉnh
                      </button>
                    )}
                    {remaining !== 0 && (
                      <button
                        onClick={autoFitTotal}
                        type="button"
                        className="px-2 py-1 rounded-md bg-white/[0.10] text-white/80 hover:bg-white/[0.16]"
                      >
                        Auto khớp tổng
                      </button>
                    )}
                  </div>
                  {!allocationValid && (
                    <p className="mt-1 text-xs text-rose-200">Vui lòng điều chỉnh để tổng phân bổ bằng thu nhập.</p>
                  )}
                </motion.div>
              )}

              <button
                onClick={handleIncomeNext}
                disabled={!allocationValid}
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
