"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, ChevronRight, Shield, Sparkles, Share2, ArrowRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { RISK_QUESTIONS, calculateRiskProfile, type RiskResult } from "@/lib/calculations/risk-scoring";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import Link from "next/link";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function RiskProfilePage() {
  const [step, setStep] = useState(0); // 0-4 quiz, 5 = result
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
    setAnswers(newAnswers);

    if (step < 4) {
      setStep(step + 1);
    } else {
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
        <CyberHeader size="display">Tính cách <span className="text-[#22C55E]">đầu tư</span></CyberHeader>
        <CyberSubHeader className="mt-1">
          Thuật toán AI phân tích tâm lý học hành vi — định hình chiến lược phân bổ tài sản
        </CyberSubHeader>
      </motion.div>

      {/* Progress Tracker */}
      {step < 5 && (
        <motion.div variants={fadeIn} className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <CyberSubHeader>TIẾN ĐỘ PHÂN TÍCH</CyberSubHeader>
            <CyberTypography size="xs" variant="mono" className="text-[#22C55E] font-black">{step + 1} / 5</CyberTypography>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full bg-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / 5) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}

      {/* Quiz Section */}
      <AnimatePresence mode="wait">
        {step < 5 && (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
          >
            <CyberCard className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center border border-[#22C55E]/20">
                  <UserCircle className="w-6 h-6 text-[#22C55E]" />
                </div>
                <CyberHeader size="sm">{RISK_QUESTIONS[step].question}</CyberHeader>
              </div>

              <div className="grid gap-3">
                {RISK_QUESTIONS[step].options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="group"
                  >
                    <div className="flex items-center gap-4 p-5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#22C55E]/40 hover:bg-[#22C55E]/5 transition-all text-left">
                      <span className="text-2xl group-hover:scale-110 transition-transform grayscale-[0.5] group-hover:grayscale-0">{opt.emoji}</span>
                      <div className="flex-1">
                        <CyberTypography size="sm" className="text-white/70 group-hover:text-white group-hover:font-black transition-colors">{opt.label}</CyberTypography>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-[#22C55E] group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </CyberCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Section */}
      {step === 5 && result && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto grid lg:grid-cols-5 gap-4 px-1">
          {/* Main Info */}
          <div className="lg:col-span-3">
            <CyberCard className="p-8 h-full" variant="success">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#22C55E]" />
                <CyberSubHeader color="text-[#22C55E]">KẾT QUẢ PHÂN TÍCH TÂM LÝ</CyberSubHeader>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{result.emoji}</span>
                <div>
                  <CyberHeader size="sm" className="mb-1 leading-tight">{result.label}</CyberHeader>
                  <CyberMetric size="xs" color="text-[#22C55E]">CHỈ SỐ RỦI RO: {result.score}/15</CyberMetric>
                </div>
              </div>

              <p className="text-[13px] text-white/50 leading-relaxed font-mono uppercase mb-8 border-l-2 border-[#22C55E]/30 pl-4 py-1">
                {result.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                {result.traits.map((trait) => (
                  <span key={trait} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                    {trait}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={restart} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase text-white/40 bg-white/5 rounded-lg hover:bg-white/10 border border-white/10 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                </button>
                <button
                  onClick={shareResult}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-black uppercase bg-[#22C55E] text-black rounded-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {shared ? "Đã sao chép liên kết" : "Chia sẻ kết quả"}
                </button>
              </div>
            </CyberCard>
          </div>

          {/* Allocation Strategy */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <CyberCard className="p-6 flex-1">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-4 h-4 text-[#22C55E]" />
                <CyberHeader size="xs">Phân bổ chiến lược</CyberHeader>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-full aspect-square max-w-[180px] mb-6 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={result.allocation}
                        cx="50%" cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="percent"
                        stroke="none"
                      >
                        {result.allocation.map((entry, i) => (
                          <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#08110f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: 'white', fontSize: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <CyberMetric size="xs" color="text-white">{result.score}</CyberMetric>
                    <p className="text-[8px] font-black text-white/20 uppercase">Pts</p>
                  </div>
                </div>

                <div className="w-full space-y-2">
                  {result.allocation.map((item) => (
                    <div key={item.asset} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <CyberSubHeader>{item.asset.toUpperCase()}</CyberSubHeader>
                      </div>
                      <CyberTypography size="xs" variant="mono" className="text-white font-black">{item.percent}%</CyberTypography>
                    </div>
                  ))}
                </div>
              </div>
            </CyberCard>

            <Link href="/dashboard/portfolio" className="group">
              <CyberCard className="p-5 border-[#22C55E]/40" showDecorators={false} variant="success">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <CyberHeader size="xs" className="mb-1 text-[#22C55E]">Xây danh mục AI</CyberHeader>
                    <p className="text-[10px] text-white/40 font-mono uppercase leading-tight">Phân bổ tài sản tự động dựa trên hồ sơ rủi ro của bạn</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#22C55E] group-hover:translate-x-1 transition-transform mt-1" />
                </div>
              </CyberCard>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
