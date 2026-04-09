"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles, Share2, ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { RISK_QUESTIONS, calculateRiskProfile, type RiskResult } from "@/lib/calculations/risk-scoring";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

export default function RiskProfilePage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [shared, setShared] = useState(false);

  const shareResult = async () => {
    if (!result) return;
    const text = `🦜 VietFi Advisor vừa phân tích tôi là "${result.label}" ${result.emoji}\nĐiểm: ${result.score}/15\n\nBạn thuộc tuýp nhà đầu tư nào? Làm quiz tại:`;
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

    // Add a slight delay for better UX before changing questions
    setTimeout(() => {
      setAnswers(newAnswers);
      if (step < 4) {
        setStep(step + 1);
      } else {
        const r = calculateRiskProfile(newAnswers);
        setResult(r);
        setStep(5);
      }
    }, 250);
  };

  const restart = () => {
    setStep(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-4xl mx-auto pb-12">

      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-10 mt-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Hồ sơ <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#E6B84F]">Khẩu vị rủi ro</span>
        </h1>
        <p className="text-sm md:text-base text-white/40 max-w-lg mx-auto">
          Khám phá bản ngã tài chính của bạn qua 5 tình huống giả định theo lý thuyết Hành vi (Prospect Theory).
        </p>
      </motion.div>

      {/* Progress Indicators */}
      {step < 5 && (
        <motion.div variants={itemVariants} className="flex justify-center items-center gap-2 mb-12">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-700 ease-out ${i === step
                  ? "w-8 bg-[#E6B84F] shadow-[0_0_10px_rgba(230,184,79,0.5)]"
                  : i < step
                    ? "w-8 bg-[#E6B84F]/30"
                    : "w-4 bg-white/10"
                }`}
            />
          ))}
        </motion.div>
      )}

      {/* Quiz Area */}
      <AnimatePresence mode="wait">
        {step < 5 && (
          <motion.div
            key={step}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={itemVariants}
            className="w-full max-w-2xl mx-auto"
          >
            <div className="text-center mb-10">
              <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#E6B84F] mb-6 uppercase tracking-widest">
                Tình huống {step + 1}
              </span>
              <h2 className="text-xl md:text-3xl font-medium text-white leading-snug">
                {RISK_QUESTIONS[step].question}
              </h2>
            </div>

            <div className="space-y-4">
              {RISK_QUESTIONS[step].options.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-[#E6B84F]/30 hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E6B84F]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative flex items-center justify-between z-10 gap-6">
                    <div className="flex items-center gap-5 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500 border border-white/5">
                        {opt.emoji}
                      </div>
                      <span className="text-base font-medium text-white/70 group-hover:text-white transition-colors">
                        {opt.label}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-[#E6B84F] group-hover:border-[#E6B84F] transition-all">
                      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-black transition-colors" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results Area */}
        {step === 5 && result && (
          <motion.div
            key="result"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="w-full"
          >
            {/* Top Result Insight */}
            <motion.div variants={itemVariants} className="glass-card p-10 mb-8 border border-[#E6B84F]/20 relative overflow-hidden rounded-[32px] text-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-[#E6B84F]/10 to-transparent pointer-events-none" />
              <div className="absolute -top-40 -right-20 w-80 h-80 bg-[#E6B84F]/5 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
                  className="text-7xl mb-6 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  {result.emoji}
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                  {result.label}
                </h2>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-[#E6B84F]/30 text-xs font-mono text-[#E6B84F] mb-6 tracking-widest uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  Score: {result.score}/15
                </div>

                <p className="text-base text-white/60 max-w-2xl mx-auto leading-relaxed mb-8">
                  {result.description}
                </p>

                {/* Traits Chips */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                  {result.traits.map((trait) => (
                    <span key={trait} className="px-4 py-2 rounded-xl bg-white/[0.03] text-white/70 text-sm border border-white/[0.06] backdrop-blur-md">
                      {trait}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                  <button
                    onClick={restart}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 text-sm font-medium text-white/60 bg-white/[0.02] border border-white/[0.08] hover:border-white/20 rounded-xl hover:bg-white/[0.05] transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Làm lại Quiz
                  </button>
                  <button
                    onClick={shareResult}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 text-sm font-bold bg-[#E6B84F] text-black rounded-xl hover:bg-[#FFD700] hover:shadow-[0_0_30px_rgba(230,184,79,0.3)] hover:-translate-y-0.5 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    {shared ? "Đã copy link!" : "Chia sẻ kết quả"}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Dynamic Allocation Suggestion */}
            <motion.div variants={itemVariants} className="grid lg:grid-cols-5 gap-6">

              {/* Asset Breakdown Chart */}
              <div className="lg:col-span-3 glass-card p-8 rounded-[32px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-[#E6B84F]/10">
                    <Shield className="w-5 h-5 text-[#E6B84F]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Phân bổ tối ưu</h3>
                    <p className="text-xs text-white/40 mt-1">Chiến lược đề xuất bởi AI Advisor</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={result.allocation}
                          cx="50%" cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="percent"
                          stroke="none"
                          cornerRadius={6}
                        >
                          {result.allocation.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#FFF", fontSize: 13 }}
                          itemStyle={{ color: "#FFF" }}
                          formatter={(value) => `${value}%`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold text-white">100<span className="text-xl text-white/30">%</span></span>
                      <span className="text-[10px] uppercase tracking-widest text-[#E6B84F] mt-1 font-mono">Tỉ trọng</span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    {result.allocation.map((item) => (
                      <div key={item.asset} className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}80` }} />
                          <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{item.asset}</span>
                        </div>
                        <span className="text-sm font-bold text-white/90 font-mono">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transition CTA */}
              <div className="lg:col-span-2 flex flex-col justify-end">
                <Link
                  href="/dashboard/portfolio"
                  className="group block h-full min-h-[240px] p-8 rounded-[32px] bg-gradient-to-br from-[#E6B84F]/10 to-transparent border border-[#E6B84F]/20 hover:border-[#E6B84F]/40 hover:bg-[#E6B84F]/15 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500">
                    <Sparkles className="w-24 h-24 text-[#E6B84F]" />
                  </div>

                  <div className="relative z-10 h-full flex flex-col">
                    <h4 className="text-xl font-bold text-white mb-3">Chuyển hóa vào Danh mục</h4>
                    <p className="text-sm text-white/50 leading-relaxed mb-auto">
                      Mang kết quả "{result.label}" này sang hệ thống tư vấn Portfolio. AI sẽ tự động điều chỉnh cấu trúc đầu tư phù hợp nhất cho dòng tiền của bạn.
                    </p>

                    <div className="mt-8 flex items-center gap-3 text-[#E6B84F] font-semibold group-hover:gap-5 transition-all">
                      <span>Bắt đầu ngay</span>
                      <div className="w-8 h-8 rounded-full bg-[#E6B84F]/20 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
