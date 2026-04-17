"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { addXP } from "@/lib/gamification";
import { ConfettiCannon } from "@/components/gamification/Celebration";
import { getLessonsDone, setLessonsDone } from "@/lib/storage";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";

/* ─── Lesson Data ─── */
interface Lesson {
  id: string;
  title: string;
  emoji: string;
  xp: number;
  slides: Slide[];
  quiz: Quiz;
}

interface Slide {
  title: string;
  content: string;
  highlight?: string;
}

interface Quiz {
  question: string;
  options: string[];
  correct: number;
}

const LESSONS: Lesson[] = [
  {
    id: "compound_interest",
    title: "Lãi kép — Kỳ quan thứ 8",
    emoji: "📈",
    xp: 20,
    slides: [
      {
        title: "Lãi kép là gì?",
        content: "Lãi kép là khi tiền lãi của bạn tiếp tục sinh ra lãi. Thay vì chỉ tính lãi trên số tiền gốc, lãi kép tính lãi trên cả gốc lẫn lãi đã tích lũy.",
        highlight: "Albert Einstein gọi lãi kép là 'Kỳ quan thứ 8 của thế giới'",
      },
      {
        title: "Ví dụ thực tế",
        content: "Gửi 10 triệu VNĐ với lãi suất 6%/năm. Sau 10 năm:\n• Lãi đơn: 16 triệu (chỉ +6tr lãi)\n• Lãi kép: 17.9 triệu (+7.9tr lãi)\n\nChênh lệch: 1.9 triệu — và khoảng cách này ngày càng lớn theo thời gian.",
      },
      {
        title: "Quy tắc 72",
        content: "Chia 72 cho lãi suất để biết bao lâu tiền bạn gấp đôi:\n• Lãi 6%: 72 ÷ 6 = 12 năm\n• Lãi 8%: 72 ÷ 8 = 9 năm\n• Lãi 12%: 72 ÷ 12 = 6 năm",
        highlight: "Bắt đầu sớm 5 năm = Kết quả gấp đôi nhờ lãi kép!",
      },
    ],
    quiz: {
      question: "Theo quy tắc 72, nếu lãi suất 8%/năm, bao lâu tiền bạn sẽ gấp đôi?",
      options: ["6 năm", "9 năm", "12 năm", "15 năm"],
      correct: 1,
    },
  },
  {
    id: "rule_503020",
    title: "Quy tắc 50-30-20",
    emoji: "💰",
    xp: 15,
    slides: [
      {
        title: "Chia thu nhập thế nào?",
        content: "Quy tắc 50-30-20 chia thu nhập ròng thành 3 phần:\n• 50% — Nhu cầu thiết yếu (ăn, ở, đi lại)\n• 30% — Mong muốn (giải trí, mua sắm)\n• 20% — Tiết kiệm và đầu tư",
      },
      {
        title: "Áp dụng cho người Việt",
        content: "Lương 15 triệu VNĐ/tháng:\n• 7.5tr — Tiền nhà, ăn uống, xăng xe\n• 4.5tr — Cafe, gym, shopping, Netflix\n• 3tr — Gửi tiết kiệm, quỹ dự phòng, ETF\n\nNếu chi phí cố định > 50%, hãy tìm cách giảm hoặc tăng thu nhập!",
        highlight: "Với Gen Z thu nhập thấp, có thể điều chỉnh thành 60-20-20",
      },
      {
        title: "Tự động hóa",
        content: "Mẹo vàng: Chuyển khoản tự động ngay khi nhận lương!\n\n1. Lương về → Auto chuyển 20% vào tài khoản tiết kiệm\n2. Phần còn lại mới để chi tiêu\n3. Không quyết định → Không cần ý chí → Thành thói quen",
      },
    ],
    quiz: {
      question: "Theo quy tắc 50-30-20, phần nào chiếm 20% thu nhập?",
      options: ["Nhu cầu thiết yếu", "Mong muốn cá nhân", "Tiết kiệm và đầu tư", "Trả nợ"],
      correct: 2,
    },
  },
  {
    id: "dca",
    title: "DCA — Trung bình giá",
    emoji: "📊",
    xp: 20,
    slides: [
      {
        title: "DCA là gì?",
        content: "Dollar-Cost Averaging (Trung bình giá) là chiến lược đầu tư đều đặn cùng một số tiền, bất kể giá thị trường.\n\nVí dụ: Mỗi tháng mua 1 triệu VNĐ ETF VN30, không cần canh thời điểm.",
      },
      {
        title: "Tại sao DCA hiệu quả?",
        content: "• Giá cao → Mua ít đơn vị\n• Giá thấp → Mua nhiều đơn vị\n→ Trung bình hóa giá mua, giảm rủi ro mua đỉnh\n\nNghiên cứu cho thấy DCA thắng \"timing the market\" trong 80% các giai đoạn 10 năm.",
        highlight: "Time IN the market > Timing the market",
      },
      {
        title: "DCA thực chiến",
        content: "Cách áp dụng:\n1. Chọn sản phẩm (ETF VN30, vàng SJC, BTC)\n2. Đặt lịch cố định (thứ 2 đầu tháng)\n3. Số tiền cố định (500k-2tr/lần)\n4. KHÔNG nhìn giá khi mua\n5. Review mỗi quý, không mỗi ngày",
      },
    ],
    quiz: {
      question: "DCA giúp nhà đầu tư tránh được rủi ro gì nhất?",
      options: ["Lạm phát", "Mua ở đỉnh giá", "Phá sản công ty", "Thuế đầu tư"],
      correct: 1,
    },
  },
  {
    id: "emergency_fund",
    title: "Quỹ dự phòng — Tấm đệm an toàn",
    emoji: "🛡️",
    xp: 15,
    slides: [
      {
        title: "Quỹ dự phòng là gì?",
        content: "Một khoản tiền mặt dễ rút ra, dành cho những chi phí bất ngờ: mất việc, ốm đau, hỏng xe, sửa nhà.\n\nQuy tắc: Có đủ 3-6 tháng chi phí sinh hoạt.",
      },
      {
        title: "Bao nhiêu là đủ?",
        content: "Chi phí hàng tháng: 10 triệu VNĐ\n• Tối thiểu: 30 triệu (3 tháng)\n• An toàn: 60 triệu (6 tháng)\n• Freelancer: 90 triệu (9 tháng, thu nhập không ổn định)\n\nGiữ ở: Tài khoản tiết kiệm linh hoạt, KHÔNG đầu tư quỹ này!",
        highlight: "Quỹ dự phòng KHÔNG phải tiền đầu tư. Nó là bảo hiểm tâm lý.",
      },
    ],
    quiz: {
      question: "Quỹ dự phòng tối thiểu nên bằng bao nhiêu tháng chi phí?",
      options: ["1 tháng", "3 tháng", "12 tháng", "24 tháng"],
      correct: 1,
    },
  },
  {
    id: "fear_greed",
    title: "Fear & Greed — Tâm lý đám đông",
    emoji: "🧠",
    xp: 20,
    slides: [
      {
        title: "Chỉ số Sợ hãi & Tham lam",
        content: "Fear & Greed Index đo tâm lý đám đông trên thị trường tài chính:\n• 0-25: Cực kỳ sợ hãi (Extreme Fear)\n• 25-50: Sợ hãi (Fear)\n• 50-75: Tham lam (Greed)\n• 75-100: Cực kỳ tham lam (Extreme Greed)",
      },
      {
        title: "Warren Buffett nói gì?",
        content: "\"Hãy sợ hãi khi người khác tham lam, và tham lam khi người khác sợ hãi.\"\n\n• Khi F&G > 75: Mọi người đua nhau mua → Cẩn thận, có thể gần đỉnh\n• Khi F&G < 25: Mọi người bán tháo → Cơ hội mua cho dài hạn",
        highlight: "F&G Index không phải tín hiệu mua/bán, mà là tấm gương phản chiếu tâm lý thị trường",
      },
      {
        title: "VietFi F&G Index",
        content: "VietFi tính chỉ số sợ hãi và tham lam cho thị trường Việt Nam dựa trên:\n1. Động lượng VN-Index\n2. Khối lượng giao dịch\n3. Giá vàng SJC\n4. Tỷ giá USD/VND\n5. Tâm lý tin tức tài chính Việt Nam\n\nXem mỗi ngày trên dashboard → Đỡ bị cuốn theo đám đông!",
      },
    ],
    quiz: {
      question: "Theo Warren Buffett, bạn nên làm gì khi F&G Index rất thấp (Extreme Fear)?",
      options: ["Bán hết tài sản", "Cân nhắc mua thêm", "Không làm gì", "Chuyển sang vàng"],
      correct: 1,
    },
  },
];

/* ─── Learn Page ─── */
export default function LearnPage() {
  const [mounted, setMounted] = useState(false);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCompletedIds(getLessonsDone());
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function startLesson(l: Lesson) {
    setActiveLesson(l);
    setSlideIdx(0);
    setShowQuiz(false);
    setSelected(null);
    setAnswered(false);
  }

  function handleAnswer(idx: number) {
    if (answered || !activeLesson) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === activeLesson.quiz.correct) {
      addXP("learn_lesson");
      const done = getLessonsDone();
      if (!done.includes(activeLesson.id)) {
        const next = [...done, activeLesson.id];
        setLessonsDone(next);
        setCompletedIds(next);
      }
      setShowConfetti(true);
    }
  }

  if (!mounted) return null;

  if (!activeLesson) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <CyberHeader size="display">Học tài chính <span className="text-[#22C55E]">60s</span></CyberHeader>
            <CyberSubHeader className="mt-1">Kiến thức cơ bản giúp bạn định hình tư duy đầu tư dài hạn</CyberSubHeader>
          </div>
          <div className="text-right">
            <CyberTypography size="xs" variant="mono" className="text-white/20 font-black tracking-widest uppercase">TIẾN ĐỘ</CyberTypography>
            <CyberMetric size="xs" color="text-[#22C55E]">{completedIds.length}/{LESSONS.length}</CyberMetric>
          </div>
        </div>

        <div className="grid gap-3">
          {LESSONS.map((l, i) => {
            const done = completedIds.includes(l.id);
            return (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => startLesson(l)}
                className="block text-left group"
              >
                <CyberCard
                  className={cn("p-4 group-hover:border-[#22C55E]/40 transition-all", done && "border-[#22C55E]/10 bg-[#22C55E]/[0.02]")}
                  showDecorators={false}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                      done ? "bg-[#22C55E]/20" : "bg-white/5 border border-white/10 group-hover:bg-[#22C55E]/10 group-hover:border-[#22C55E]/20"
                    )}>
                      {done ? "✅" : l.emoji}
                    </div>
                    <div className="flex-1">
                      <CyberTypography size="sm" className={cn("font-black", done ? "text-[#22C55E]/80" : "text-white")}>
                        {l.title.toUpperCase()}
                      </CyberTypography>
                      <CyberSubHeader>{l.slides.length} SLIDES + QUIZ PHÂN TÍCH</CyberSubHeader>
                    </div>
                    <div className="text-right">
                      <CyberTypography size="xs" variant="mono" className={cn("font-black", done ? "text-[#22C55E]/30" : "text-[#22C55E]")}>+{l.xp} XP</CyberTypography>
                    </div>
                  </div>
                </CyberCard>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  const slide = !showQuiz ? activeLesson.slides[slideIdx] : null;
  const isLast = slideIdx === activeLesson.slides.length - 1;

  return (
    <>
      <ConfettiCannon active={showConfetti} onDone={() => setShowConfetti(false)} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl mx-auto">
        {/* Active Lesson Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveLesson(null)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <CyberHeader size="xs" className="mb-2">{activeLesson.emoji} {activeLesson.title.toUpperCase()}</CyberHeader>
            <div className="flex gap-1.5 h-1.5">
              {activeLesson.slides.map((_, i) => (
                <div key={i} className={cn(
                  "flex-1 rounded-full transition-all duration-500",
                  i <= slideIdx || showQuiz ? "bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-white/5"
                )} />
              ))}
              <div className={cn(
                "flex-1 rounded-full transition-all duration-500",
                showQuiz ? "bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-white/5"
              )} />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {!showQuiz && slide ? (
            <motion.div
              key={`slide-${slideIdx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CyberCard className="p-8">
                <CyberHeader size="sm" className="mb-6">{slide.title.toUpperCase()}</CyberHeader>
                <p className="text-[13px] text-white/60 font-mono uppercase leading-relaxed whitespace-pre-line mb-8">
                  {slide.content}
                </p>
                {slide.highlight && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/10">
                    <Sparkles className="w-5 h-5 text-[#22C55E] mt-0.5 shrink-0" />
                    <p className="text-xs text-[#22C55E] italic font-mono uppercase tracking-tight">{slide.highlight}</p>
                  </div>
                )}
              </CyberCard>
            </motion.div>
          ) : showQuiz ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CyberCard className="p-8" variant={answered ? (selected === activeLesson.quiz.correct ? "success" : "danger") : "neutral"}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="px-3 py-1 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded text-[9px] font-black text-[#22C55E] uppercase tracking-widest">PHÂN TÍCH QUAN ĐIỂM</div>
                </div>
                <CyberHeader size="sm" className="mb-8 leading-tight">{activeLesson.quiz.question.toUpperCase()}</CyberHeader>

                <div className="grid gap-3">
                  {activeLesson.quiz.options.map((opt, i) => {
                    const isCorrect = i === activeLesson.quiz.correct;
                    const isSelected = i === selected;
                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={answered}
                        className={cn(
                          "w-full text-left px-5 py-4 rounded-xl text-xs font-mono uppercase transition-all border",
                          !answered && "bg-white/5 border-white/10 text-white/60 hover:border-[#22C55E]/40 hover:text-white",
                          answered && isCorrect && "bg-[#22C55E]/20 border-[#22C55E]/40 text-[#22C55E] font-black shadow-[0_0_15px_rgba(34,197,94,0.1)]",
                          answered && isSelected && !isCorrect && "bg-red-500/10 border-red-500/40 text-red-400 font-black",
                          answered && !isSelected && !isCorrect && "bg-transparent border-white/5 text-white/10"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black opacity-30">{String.fromCharCode(64 + i + 1)}</span>
                          <span className="flex-1">{opt}</span>
                          {answered && isCorrect && <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {answered && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 pt-8 border-t border-white/10 text-center">
                      {selected === activeLesson.quiz.correct ? (
                        <div className="space-y-4">
                          <CyberMetric size="xs" color="text-[#22C55E]">CHÍNH XÁC • +{activeLesson.xp} XP</CyberMetric>
                          <button
                            onClick={() => setActiveLesson(null)}
                            className="w-full py-3 bg-[#22C55E] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all"
                          >
                            Hoàn thành bài học
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <CyberTypography size="xs" variant="mono" className="text-red-400 font-black">PHÂN TÍCH CHƯA PHÙ HỢP. HÃY THỬ LẠI!</CyberTypography>
                          <button
                            onClick={() => { setAnswered(false); setSelected(null); }}
                            className="w-full py-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all border border-white/10"
                          >
                            Thử lại
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CyberCard>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Navigation Controls */}
        {!showQuiz && (
          <div className="flex justify-between items-center px-1">
            <button
              onClick={() => slideIdx > 0 ? setSlideIdx(slideIdx - 1) : setActiveLesson(null)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> {slideIdx > 0 ? "BÀI TRƯỚC" : "THOÁT"}
            </button>
            <button
              onClick={() => isLast ? setShowQuiz(true) : setSlideIdx(slideIdx + 1)}
              className="flex items-center justify-center gap-3 px-8 py-3 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#22C55E] hover:bg-[#22C55E]/20 transition-all"
            >
              {isLast ? "BẮT ĐẦU QUIZ" : "TIẾP THEO"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
