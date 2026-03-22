"use client";

import { motion } from "framer-motion";
import { UserCircle, ChevronRight, Shield, Sparkles, Share2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { RISK_QUESTIONS, calculateRiskProfile, type RiskResult } from "@/lib/calculations/risk-scoring";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Link from "next/link";

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function RiskProfilePage() {
  const [step, setStep] = useState(0); // 0-4 quiz, 5 = result
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [shared, setShared] = useState(false);

  const shareResult = async () => {
    if (!result) return;
    const text = `🦜 VietFi Advisor vừa phân tích tôi là "${result.label}" ${result.emoji}\nScore: ${result.score}/15\n\nBạn thuộc tuýp nhà đầu tư nào? Làm quiz tại:`;
    const url = typeof window !== "undefined" ? window.location.origin + "/dashboard/risk-profile" : "";

    if (navigator.share) {
      try {
        await navigator.share({ title: "Tính cách đầu tư của tôi — VietFi", text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (step < 4) {
      setStep(step + 1);
    } else {
      // Calculate result
      const r = calculateRiskProfile(newAnswers);
      setResult(r);
      setStep(5);
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">
          Tính cách <span className="text-gradient">đầu tư</span>
        </h1>
        <p className="text-[13px] text-white/40">
          5 câu hỏi tâm lý học hành vi → biết mình thuộc tuýp nhà đầu tư nào
        </p>
      </motion.div>

      {/* Progress */}
      {step < 5 && (
        <motion.div variants={fadeIn} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-white/25">CÂU {step + 1}/5</span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#E6B84F] to-[#FF6B35] rounded-full transition-all duration-500" style={{ width: `${((step + 1) / 5) * 100}%` }} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Quiz */}
      {step < 5 && (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass-card p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle className="w-5 h-5 text-[#E6B84F]" />
              <h2 className="text-lg font-bold text-white">{RISK_QUESTIONS[step].question}</h2>
            </div>
            <div className="space-y-3">
              {RISK_QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#E6B84F]/30 hover:bg-[#E6B84F]/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors flex-1">{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-[#E6B84F] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Result */}
      {step === 5 && result && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="max-w-3xl mx-auto">
          {/* Result Card */}
          <div className="glass-card p-6 mb-4 border-[#E6B84F]/10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#E6B84F]" />
                <span className="text-[10px] text-[#E6B84F] font-mono uppercase tracking-wider">KẾT QUẢ TÍNH CÁCH ĐẦU TƯ</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{result.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{result.label}</h2>
                  <p className="text-xs text-white/40">Score: {result.score}/15</p>
                </div>
              </div>
              <p className="text-[13px] text-white/50 leading-relaxed mb-4">{result.description}</p>

              {/* Traits */}
              <div className="flex flex-wrap gap-2 mb-4">
                {result.traits.map((trait) => (
                  <span key={trait} className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] text-white/50 border border-white/[0.06]">
                    {trait}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={restart} className="px-4 py-2 text-xs font-medium text-white/50 bg-white/[0.04] rounded-lg hover:bg-white/[0.08] transition-colors">
                  Làm lại
                </button>
                <button onClick={shareResult} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gradient-primary text-black rounded-lg hover:shadow-[0_0_20px_rgba(230,184,79,0.2)] transition-all">
                  <Share2 className="w-3.5 h-3.5" />
                  {shared ? "✅ Đã copy!" : "Chia sẻ"}
                </button>
              </div>

              {/* CTA → Portfolio */}
              <Link href="/dashboard/portfolio" className="group flex items-center justify-between p-3 rounded-xl bg-[#E6B84F]/5 border border-[#E6B84F]/10 hover:bg-[#E6B84F]/10 transition-all">
                <div>
                  <span className="text-xs font-semibold text-[#E6B84F]">🎯 Xây danh mục theo tính cách của bạn</span>
                  <p className="text-[10px] text-white/30 mt-0.5">AI sẽ gợi ý phân bổ tài sản phù hợp với mức chấp nhận rủi ro của bạn</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#E6B84F] group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* Re-test hint */}
              <p className="text-[10px] text-white/20 mt-3 text-center">💡 Tâm lý đầu tư thay đổi theo thị trường — làm lại mỗi quý để cập nhật</p>
            </div>
          </div>

          {/* Allocation */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#E6B84F]" />
              Gợi ý phân bổ
            </h3>
            <div className="flex items-center gap-5">
              <div className="w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={result.allocation} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="percent" stroke="none">
                      {result.allocation.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {result.allocation.map((item) => (
                  <div key={item.asset} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-white/50">{item.asset}</span>
                    </div>
                    <span className="text-xs font-bold text-white/80">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
