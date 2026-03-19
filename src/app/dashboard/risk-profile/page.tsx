"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { UserCircle, ChevronRight, Shield, Sparkles } from "lucide-react";

type Answer = "a" | "b" | "c";

const questions = [
  {
    id: 1,
    question: "Thị trường giảm 15% trong tuần, bạn sẽ:",
    options: [
      { value: "a" as Answer, label: "Bán ngay để cắt lỗ" },
      { value: "b" as Answer, label: "Giữ nguyên, chờ hồi phục" },
      { value: "c" as Answer, label: "Mua thêm vì đây là cơ hội" },
    ],
  },
  {
    id: 2,
    question: "Bạn có quỹ dự phòng bao nhiêu tháng chi tiêu?",
    options: [
      { value: "a" as Answer, label: "Dưới 3 tháng" },
      { value: "b" as Answer, label: "3-6 tháng" },
      { value: "c" as Answer, label: "Trên 6 tháng" },
    ],
  },
  {
    id: 3,
    question: "Bạn sẵn sàng chờ bao lâu để thấy lợi nhuận?",
    options: [
      { value: "a" as Answer, label: "Dưới 6 tháng" },
      { value: "b" as Answer, label: "1-3 năm" },
      { value: "c" as Answer, label: "Trên 3 năm, không vấn đề" },
    ],
  },
  {
    id: 4,
    question: "Thu nhập hiện tại của bạn có ổn định không?",
    options: [
      { value: "a" as Answer, label: "Không ổn định (freelance, kinh doanh)" },
      { value: "b" as Answer, label: "Khá ổn (hợp đồng lương)" },
      { value: "c" as Answer, label: "Rất ổn (doanh thu đa nguồn)" },
    ],
  },
  {
    id: 5,
    question: "Nếu mất 20% vốn đầu tư, bạn cảm thấy:",
    options: [
      { value: "a" as Answer, label: "Rất lo lắng, mất ngủ" },
      { value: "b" as Answer, label: "Khó chịu nhưng chấp nhận được" },
      { value: "c" as Answer, label: "Bình thường, chuyện thường ngày" },
    ],
  },
];

const scoreMap: Record<Answer, number> = { a: 1, b: 2, c: 3 };

const profiles = [
  {
    range: [5, 8],
    name: "Bảo thủ",
    emoji: "🛡️",
    color: "#00E5FF",
    desc: "Bạn ưu tiên bảo toàn vốn. Nên tập trung tiết kiệm + vàng, tránh crypto và cổ phiếu volatility cao.",
    traits: ["Bảo toàn vốn là ưu tiên #1", "Thích ổn định, không thích rủi ro", "Nên focus: Tiết kiệm, Vàng, Trái phiếu"],
  },
  {
    range: [9, 12],
    name: "Cân bằng",
    emoji: "⚖️",
    color: "#FFD700",
    desc: "Bạn chấp nhận rủi ro vừa phải. Phân bổ đều giữa các kênh an toàn và tăng trưởng.",
    traits: ["Cân bằng rủi ro và lợi nhuận", "Có thể chịu biến động ngắn hạn", "Nên focus: Mix đều 5 kênh"],
  },
  {
    range: [13, 15],
    name: "Tăng trưởng",
    emoji: "🚀",
    color: "#00E676",
    desc: "Bạn sẵn sàng chấp nhận rủi ro cao để tìm kiếm lợi nhuận vượt trội. Phù hợp chứng khoán + crypto.",
    traits: ["Chấp nhận rủi ro cao", "Kiên nhẫn, tầm nhìn dài hạn", "Nên focus: Chứng khoán, Crypto, BĐS"],
  },
];

export default function RiskProfilePage() {
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [showResult, setShowResult] = useState(false);

  const totalScore = Object.values(answers).reduce(
    (sum, a) => sum + scoreMap[a],
    0
  );
  const profile = profiles.find(
    (p) => totalScore >= p.range[0] && totalScore <= p.range[1]
  ) || profiles[1];

  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold text-white mb-2">
        Risk <span className="text-gradient">DNA</span> Profile
      </h1>
      <p className="text-[#8888AA] mb-8">
        Đánh giá profile rủi ro thực sự của bạn qua 5 câu hỏi tình huống — không phải trắc nghiệm nhàm chán.
      </p>

      {!showResult ? (
        <div className="max-w-2xl mx-auto space-y-6">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6"
            >
              <p className="text-sm text-[#FFD700] mb-1">Câu {q.id}/5</p>
              <p className="text-base font-medium text-white mb-4">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt.value })}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center gap-3 ${
                      answers[q.id] === opt.value
                        ? "bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30"
                        : "bg-white/[0.03] text-[#8888AA] border border-[#2A2A3A] hover:border-[#FFD700]/20 hover:text-white"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        answers[q.id] === opt.value
                          ? "border-[#FFD700] bg-[#FFD700]"
                          : "border-[#2A2A3A]"
                      }`}
                    >
                      {answers[q.id] === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-black" />
                      )}
                    </div>
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}

          <button
            onClick={() => setShowResult(true)}
            disabled={!allAnswered}
            className={`w-full py-4 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 ${
              allAnswered
                ? "bg-gradient-primary text-black hover:shadow-[0_0_30px_rgba(255,215,0,0.3)]"
                : "bg-[#2A2A3A] text-[#666680] cursor-not-allowed"
            }`}
          >
            Xem kết quả <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          {/* Profile card */}
          <div
            className="glass-card p-8 text-center"
            style={{ borderColor: `${profile.color}30`, boxShadow: `0 0 40px ${profile.color}10` }}
          >
            <div className="text-6xl mb-4">{profile.emoji}</div>
            <h2 className="text-3xl font-black mb-2" style={{ color: profile.color }}>
              {profile.name}
            </h2>
            <p className="text-[#8888AA] mb-4">Điểm rủi ro: {totalScore}/15</p>
            <div className="w-full h-3 bg-[#2A2A3A] rounded-full overflow-hidden mb-6">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(totalScore / 15) * 100}%`,
                  backgroundColor: profile.color,
                }}
              />
            </div>
            <p className="text-sm text-[#8888AA] leading-relaxed">{profile.desc}</p>
          </div>

          {/* Traits */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#FFD700]" />
              Đặc điểm Risk DNA
            </h3>
            <div className="space-y-3">
              {profile.traits.map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-[#8888AA]">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${profile.color}15`, color: profile.color }}>
                    {i + 1}
                  </div>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* AI Advice */}
          <div className="glass-card p-6 border-[#FFD700]/10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#FFD700]" />
              <span className="text-sm font-semibold text-[#FFD700]">AI Lời khuyên</span>
            </div>
            <p className="text-sm text-[#8888AA] leading-relaxed">
              Với profile <strong className="text-white">{profile.name}</strong> và bối cảnh thị trường hiện tại
              (Fear & Greed = 38, lạm phát 3.8%), AI khuyến nghị bạn sử dụng trang{" "}
              <strong className="text-[#FFD700]">Portfolio Advisor</strong> để nhận gợi ý phân bổ vốn
              tối ưu theo profile rủi ro này.
            </p>
          </div>

          <button
            onClick={() => { setShowResult(false); setAnswers({}); }}
            className="w-full py-3 border border-[#2A2A3A] rounded-lg text-[#8888AA] hover:text-white hover:border-[#FFD700]/30 transition-all text-sm"
          >
            Làm lại
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
