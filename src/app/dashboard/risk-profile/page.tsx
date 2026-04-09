"use client"

import { motion, AnimatePresence, type Variants } from "framer-motion"
import { Shield, Sparkles, Share2, ArrowRight, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useState, useCallback } from "react"
import { RISK_QUESTIONS, calculateRiskProfile, type RiskResult } from "@/lib/calculations/risk-scoring"
import { setRiskResult } from "@/lib/storage"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import Link from "next/link"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
}

const TYPE_LABELS = {
  conservative: { label: "Bảo thủ", color: "#00E5FF" },
  balanced: { label: "Cân bằng", color: "#E6B84F" },
  growth: { label: "Tăng trưởng", color: "#22C55E" },
}

export default function RiskProfilePage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<RiskResult | null>(null)
  const [shared, setShared] = useState(false)

  const shareResult = async () => {
    if (!result) return
    const confidencePct = Math.round(result.confidence * 100)
    const text = `🦜 VietFi Advisor phân tích tôi là "${result.label}" ${result.emoji} (độ tin cậy ${confidencePct}%)\n\nBạn thuộc tuýp nhà đầu tư nào? Làm quiz tại:`
    const url = typeof window !== "undefined" ? window.location.origin + "/dashboard/risk-profile" : ""

    if (navigator.share) {
      try { await navigator.share({ title: "Tính cách đầu tư — VietFi", text, url }) }
      catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }

  const handleAnswer = useCallback((value: number) => {
    const newAnswers = [...answers, value]
    setTimeout(() => {
      setAnswers(newAnswers)
      if (step < 4) {
        setStep(step + 1)
      } else {
        const r = calculateRiskProfile(newAnswers)
        setResult(r)
        setRiskResult(r)   // persist to localStorage
        setStep(5)
      }
    }, 220)
  }, [answers, step])

  const restart = useCallback(() => {
    setStep(0)
    setAnswers([])
    setResult(null)
  }, [])

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-4xl mx-auto pb-12"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-10 mt-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
          Hồ sơ <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#E6B84F]">Khẩu vị rủi ro</span>
        </h1>
        <p className="text-sm text-white/40 max-w-lg mx-auto">
          5 tình huống giả định dựa trên <strong className="text-white/60">Lý thuyết Triển vọng</strong> (Prospect Theory) — không có đáp án đúng hay sai
        </p>
      </motion.div>

      {/* Progress pills */}
      {step < 5 && (
        <motion.div variants={itemVariants} className="flex justify-center items-center gap-2 mb-10">
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

      {/* Quiz */}
      <AnimatePresence mode="wait">
        {step < 5 && (
          <motion.div
            key={step}
            initial="hidden" animate="visible" exit="exit"
            variants={itemVariants}
            className="w-full max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#E6B84F] mb-5 uppercase tracking-widest">
                Tình huống {step + 1} / 5
              </span>
              <h2 className="text-xl md:text-2xl font-semibold text-white leading-snug mb-2">
                {RISK_QUESTIONS[step].question}
              </h2>
              {RISK_QUESTIONS[step].hint && (
                <p className="text-xs text-white/30 mx-auto max-w-md">
                  💡 {RISK_QUESTIONS[step].hint}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {RISK_QUESTIONS[step].options.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.012, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-[#E6B84F]/30 hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E6B84F]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center justify-between z-10 gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-black/40 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-400 border border-white/5 shrink-0">
                        {opt.emoji}
                      </div>
                      <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors leading-relaxed">
                        {opt.label}
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-[#E6B84F] group-hover:border-[#E6B84F] transition-all shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-black transition-colors" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {step === 5 && result && (
          <motion.div
            key="result"
            initial="hidden" animate="visible"
            variants={containerVariants}
            className="w-full"
          >
            {/* Contradiction warning */}
            {result.hasContradiction && (
              <motion.div
                variants={itemVariants}
                className="mb-6 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 flex items-start gap-3"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-300 mb-0.5">Phát hiện mâu thuẫn trong câu trả lời</p>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Một số câu trả lời của bạn có dấu hiệu không nhất quán (ví dụ: hành vi tích cực trong lý thuyết nhưng phản ứng thận trọng khi thực sự đối mặt với rủi ro). Kết quả hiển thị mang tính tham khảo — bạn nên làm lại sau 1–2 tuần để có kết quả chính xác hơn.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Hero result card */}
            <motion.div
              variants={itemVariants}
              className="glass-card p-10 mb-6 border border-[#E6B84F]/20 relative overflow-hidden rounded-[28px] text-center"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-[#E6B84F]/8 to-transparent pointer-events-none" />
              <div className="absolute -top-40 -right-20 w-80 h-80 bg-[#E6B84F]/5 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
                  className="text-7xl mb-5 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                >
                  {result.emoji}
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                  {result.label}
                </h2>

                {/* Confidence badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-[#E6B84F]/30 text-xs font-mono text-[#E6B84F] mb-3 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" />
                  Độ tin cậy: {Math.round(result.confidence * 100)}%
                </div>

                {/* Consistency indicator */}
                <div className={`inline-flex items-center gap-1.5 text-xs mb-6 ${result.consistency >= 0.7 ? "text-green-400" : "text-yellow-400"}`}>
                  {result.consistency >= 0.7
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : <AlertTriangle className="w-3.5 h-3.5" />
                  }
                  Độ nhất quán câu trả lời: {Math.round(result.consistency * 100)}%
                </div>

                <p className="text-sm text-white/55 max-w-2xl mx-auto leading-relaxed mb-6">
                  {result.description}
                </p>

                {/* Traits */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {result.traits.map((trait) => (
                    <span key={trait} className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] text-white/65 text-xs border border-white/[0.06] backdrop-blur-md">
                      {trait}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                  <button
                    onClick={restart}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 text-sm font-medium text-white/55 bg-white/[0.02] border border-white/[0.08] hover:border-white/20 rounded-xl hover:bg-white/[0.05] transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Làm lại
                  </button>
                  <button
                    onClick={shareResult}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 text-sm font-bold bg-[#E6B84F] text-black rounded-xl hover:bg-[#FFD700] hover:shadow-[0_0_30px_rgba(230,184,79,0.3)] hover:-translate-y-0.5 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    {shared ? "Đã copy link!" : "Chia sẻ"}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Probability distribution bar */}
            <motion.div variants={itemVariants} className="glass-card p-6 mb-6 rounded-[24px]">
              <h3 className="text-sm font-semibold text-white mb-1">Phân phối xác suất</h3>
              <p className="text-xs text-white/35 mb-5">Hệ thống không phân loại cứng — đây là phân phối xác suất dựa trên hành vi của bạn</p>

              <div className="space-y-4">
                {(Object.entries(result.distribution) as [keyof typeof TYPE_LABELS, number][]).map(([type, prob]) => {
                  const meta = TYPE_LABELS[type]
                  const pct = Math.round(prob * 100)
                  const isPrimary = type === result.type
                  return (
                    <div key={type}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-xs font-medium ${isPrimary ? "text-white" : "text-white/40"}`}>
                          {meta.label}
                          {isPrimary && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">Chính</span>}
                        </span>
                        <span className={`text-xs font-bold font-mono ${isPrimary ? "text-white" : "text-white/40"}`}>{pct}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                          style={{ backgroundColor: isPrimary ? meta.color : `${meta.color}40` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-[10px] text-white/20 mt-4">
                💡 Tâm lý đầu tư thay đổi theo thị trường — làm lại mỗi quý để cập nhật hồ sơ
              </p>
            </motion.div>

            {/* Allocation + CTA grid */}
            <motion.div variants={itemVariants} className="grid lg:grid-cols-5 gap-5">
              {/* Pie */}
              <div className="lg:col-span-3 glass-card p-7 rounded-[24px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-[#E6B84F]/10">
                    <Shield className="w-5 h-5 text-[#E6B84F]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Phân bổ tối ưu</h3>
                    <p className="text-xs text-white/35 mt-0.5">Chiến lược đề xuất bởi AI Advisor</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-7">
                  <div className="w-44 h-44 sm:w-52 sm:h-52 shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={result.allocation}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={90}
                          paddingAngle={4} dataKey="percent"
                          stroke="none" cornerRadius={5}
                        >
                          {result.allocation.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#FFF", fontSize: 12 }}
                          formatter={(value) => `${value}%`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-white">100<span className="text-base text-white/30">%</span></span>
                      <span className="text-[9px] uppercase tracking-widest text-[#E6B84F] mt-1 font-mono">Tỉ trọng</span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    {result.allocation.map((item) => (
                      <div key={item.asset} className="flex justify-between items-center group">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}70` }} />
                          <span className="text-sm text-white/60 group-hover:text-white transition-colors">{item.asset}</span>
                        </div>
                        <span className="text-sm font-bold text-white/80 font-mono">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="lg:col-span-2">
                <Link
                  href="/dashboard/portfolio"
                  className="group block h-full min-h-[220px] p-7 rounded-[24px] bg-gradient-to-br from-[#E6B84F]/10 to-transparent border border-[#E6B84F]/20 hover:border-[#E6B84F]/40 hover:bg-[#E6B84F]/12 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-5 opacity-15 group-hover:opacity-35 group-hover:scale-110 transition-all duration-500">
                    <Sparkles className="w-20 h-20 text-[#E6B84F]" />
                  </div>
                  <div className="relative z-10 h-full flex flex-col">
                    <h4 className="text-lg font-bold text-white mb-2">Chuyển hóa vào Danh mục</h4>
                    <p className="text-sm text-white/45 leading-relaxed mb-auto">
                      Mang kết quả <strong className="text-white/65">"{result.label}"</strong> sang Portfolio Advisor. AI sẽ điều chỉnh cấu trúc đầu tư theo hành vi thực tế của bạn.
                    </p>
                    <div className="mt-7 flex items-center gap-2.5 text-[#E6B84F] font-semibold group-hover:gap-4 transition-all text-sm">
                      <span>Bắt đầu ngay</span>
                      <div className="w-7 h-7 rounded-full bg-[#E6B84F]/20 flex items-center justify-center">
                        <ArrowRight className="w-3.5 h-3.5" />
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
  )
}
