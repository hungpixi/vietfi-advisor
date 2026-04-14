"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { addXP } from "@/lib/gamification";
import { ConfettiCannon } from "@/components/gamification/Celebration";
import { getLessonsDone, setLessonsDone } from "@/lib/storage";

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
        content: "VietFi tính F&G Index cho thị trường Việt Nam dựa trên:\n1. VN-Index momentum\n2. Volume giao dịch\n3. Giá vàng SJC\n4. Tỷ giá USD/VND\n5. Sentiment tin tức tài chính VN\n\nCheck mỗi ngày trên dashboard → Không bị FOMO!",
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
    const done = getLessonsDone();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletedIds(done);
    setMounted(true);
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

  // Lesson list
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#E6B84F]/30 border-t-[#E6B84F] animate-spin" />
      </div>
    );
  }

  if (!activeLesson) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#E6B84F]" />
              Bài Học Vẹt
            </h1>
            <p className="text-xs text-white/30 mt-0.5">Học tài chính 60 giây — kiếm XP</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-white/20">
            {completedIds.length}/{LESSONS.length}
          </span>
        </div>

        <div className="grid gap-2">
          {LESSONS.map((l, i) => {
            const done = completedIds.includes(l.id);
            return (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => startLesson(l)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl text-left transition-all w-full",
                  done
                    ? "glass-card border-[#22C55E]/10 bg-[#22C55E]/[0.02]"
                    : "glass-card hover:border-[#E6B84F]/20"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xl",
                  done ? "bg-[#22C55E]/10" : "bg-white/[0.04]"
                )}>
                  {done ? "✅" : l.emoji}
                </div>
                <div className="flex-1">
                  <span className={cn("text-sm font-medium", done ? "text-[#22C55E]/60" : "text-white/80")}>
                    {l.title}
                  </span>
                  <p className="text-[10px] text-white/20">{l.slides.length} slides + quiz</p>
                </div>
                <span className={cn(
                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full",
                  done ? "text-[#22C55E]/30 bg-[#22C55E]/5" : "text-[#E6B84F] bg-[#E6B84F]/10"
                )}>
                  +{l.xp} XP
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // Active lesson
  const slide = !showQuiz ? activeLesson.slides[slideIdx] : null;
  const isLast = slideIdx === activeLesson.slides.length - 1;

  return (
    <>
      <ConfettiCannon active={showConfetti} onDone={() => setShowConfetti(false)} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveLesson(null)} className="text-white/30 hover:text-white/60 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white">{activeLesson.emoji} {activeLesson.title}</h2>
            {/* Progress dots */}
            <div className="flex gap-1 mt-1">
              {activeLesson.slides.map((_, i) => (
                <div key={i} className={cn(
                  "h-1 rounded-full transition-all",
                  i <= slideIdx || showQuiz ? "bg-[#E6B84F] w-6" : "bg-white/10 w-3"
                )} />
              ))}
              <div className={cn(
                "h-1 rounded-full transition-all",
                showQuiz ? "bg-[#A855F7] w-6" : "bg-white/10 w-3"
              )} />
            </div>
          </div>
        </div>

        {/* Slide or Quiz */}
        <AnimatePresence mode="wait">
          {!showQuiz && slide ? (
            <motion.div
              key={`slide-${slideIdx}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-5 space-y-3"
            >
              <h3 className="text-base font-bold text-white">{slide.title}</h3>
              <p className="text-sm text-white/60 whitespace-pre-line leading-relaxed">{slide.content}</p>
              {slide.highlight && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#E6B84F]/5 border border-[#E6B84F]/10">
                  <Sparkles className="w-4 h-4 text-[#E6B84F] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#E6B84F]/80 italic">{slide.highlight}</p>
                </div>
              )}
            </motion.div>
          ) : showQuiz ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-5 space-y-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A855F7]/60">QUIZ</span>
              </div>
              <h3 className="text-sm font-bold text-white">{activeLesson.quiz.question}</h3>
              <div className="space-y-2 pt-1">
                {activeLesson.quiz.options.map((opt, i) => {
                  const isCorrect = i === activeLesson.quiz.correct;
                  const isSelected = i === selected;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={answered}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all",
                        !answered && "hover:bg-white/[0.06] bg-white/[0.02] border border-white/[0.06] text-white/70",
                        answered && isCorrect && "bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]",
                        answered && isSelected && !isCorrect && "bg-red-500/10 border border-red-500/20 text-red-400",
                        answered && !isSelected && !isCorrect && "bg-white/[0.01] border border-white/[0.03] text-white/20"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/20">{String.fromCharCode(65 + i)}</span>
                        {opt}
                        {answered && isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto text-[#22C55E]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {answered && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
                  {selected === activeLesson.quiz.correct ? (
                    <div className="text-center space-y-2">
                      <p className="text-sm font-bold text-[#22C55E]">🎉 Chính xác! +{activeLesson.xp} XP</p>
                      <button
                        onClick={() => setActiveLesson(null)}
                        className="px-4 py-2 bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold rounded-lg hover:bg-[#22C55E]/20 transition"
                      >
                        Tiếp tục bài khác →
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-sm text-red-400">Chưa đúng! Thử lại nhé.</p>
                      <button
                        onClick={() => { setAnswered(false); setSelected(null); }}
                        className="px-4 py-2 bg-white/[0.04] text-white/60 text-xs font-bold rounded-lg hover:bg-white/[0.08] transition"
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Navigation */}
        {!showQuiz && (
          <div className="flex justify-between">
            <button
              onClick={() => slideIdx > 0 ? setSlideIdx(slideIdx - 1) : setActiveLesson(null)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/30 hover:text-white/60 transition"
            >
              <ArrowLeft className="w-3 h-3" /> {slideIdx > 0 ? "Trước" : "Thoát"}
            </button>
            <button
              onClick={() => isLast ? setShowQuiz(true) : setSlideIdx(slideIdx + 1)}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-[#E6B84F] bg-[#E6B84F]/10 rounded-lg hover:bg-[#E6B84F]/20 transition"
            >
              {isLast ? "Làm Quiz" : "Tiếp"} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
