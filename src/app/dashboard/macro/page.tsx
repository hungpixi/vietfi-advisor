"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Minus, Globe, Sparkles } from "lucide-react";

/* ─── Data ─── */
const macroIndicators = [
  { name: "GDP Growth", value: "5.2%", change: "+0.3%", trend: "up" as const, desc: "Quý 4/2025 — tăng trưởng ổn định", emoji: "📈" },
  { name: "CPI (YoY)", value: "3.31%", change: "-0.2%", trend: "down" as const, desc: "Tháng 3/2026 — lạm phát giảm nhẹ", emoji: "💰" },
  { name: "Lãi suất kỳ hạn 12T", value: "5.2%", change: "0%", trend: "neutral" as const, desc: "Trung bình Top 10 ngân hàng", emoji: "🏦" },
  { name: "USD/VND", value: "25,480", change: "+0.1%", trend: "up" as const, desc: "Ổn định, NHNN kiểm soát tốt", emoji: "💵" },
  { name: "Foreign Net Buy", value: "-200 tỷ", change: "-50 tỷ", trend: "down" as const, desc: "Khối ngoại tiếp tục bán ròng", emoji: "🌍" },
  { name: "Gold SJC", value: "93.5tr", change: "+1.2%", trend: "up" as const, desc: "Lập đỉnh mới — chênh thế giới 18tr", emoji: "🪙" },
];

const aiCommentary = {
  title: "Tóm tắt vĩ mô AI",
  content: "Kinh tế Việt Nam Q1/2026 duy trì đà tăng trưởng 5.2%, lạm phát kiểm soát tốt dưới 3.5%. Tuy nhiên, rủi ro đến từ áp lực tỷ giá do Fed chậm giảm lãi suất và dòng tiền khối ngoại bán ròng liên tục. Vàng SJC tiếp tục tăng mạnh do yếu tố địa chính trị. Khuyến nghị: theo dõi sát chính sách tiền tệ NHNN trong Q2.",
  sources: ["World Bank", "GSO", "NHNN", "Bloomberg"],
};

const trendColor = { up: "#22C55E", down: "#EF4444", neutral: "#8B8D96" };
const TrendIcons = { up: TrendingUp, down: TrendingDown, neutral: Minus };

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function MacroPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">
          Xu hướng <span className="text-gradient">kinh tế</span>
        </h1>
        <p className="text-[13px] text-white/40">
          6 chỉ số kinh tế chính — dữ liệu từ World Bank, GSO, NHNN
        </p>
      </motion.div>

      {/* Indicators Grid */}
      <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {macroIndicators.map((ind) => {
          const TIcon = TrendIcons[ind.trend];
          const color = trendColor[ind.trend];
          return (
            <motion.div key={ind.name} variants={fadeIn} className="glass-card glass-card-hover p-5 transition-all cursor-default">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{ind.emoji}</span>
                <TIcon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="text-2xl font-bold text-white mb-0.5">{ind.value}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white/60">{ind.name}</span>
                <span className="text-[10px] font-medium" style={{ color }}>{ind.change}</span>
              </div>
              <p className="text-[10px] text-white/25 mt-1.5">{ind.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* AI Commentary */}
      <motion.div variants={fadeIn} className="glass-card p-5 border-[#E6B84F]/10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#E6B84F]" />
            <h2 className="text-sm font-semibold text-white">{aiCommentary.title}</h2>
          </div>
          <p className="text-[13px] text-white/50 leading-relaxed mb-3">{aiCommentary.content}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Globe className="w-3 h-3 text-white/20" />
            {aiCommentary.sources.map((s) => (
              <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.03] text-white/25 border border-white/[0.05]">{s}</span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
