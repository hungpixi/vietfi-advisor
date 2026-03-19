"use client";

import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

const fearGreedScore = 38;

const assetSentiments = [
  { asset: "Chứng khoán", score: 32, trend: "down", news: "Khối ngoại bán ròng, VN-Index giảm nhẹ" },
  { asset: "Vàng", score: 72, trend: "up", news: "Vàng lập đỉnh mới, nhu cầu trú ẩn tăng" },
  { asset: "Crypto", score: 48, trend: "neutral", news: "BTC sideway, ETF dòng tiền vào ổn định" },
  { asset: "BĐS", score: 28, trend: "down", news: "Thị trường trầm lắng, thanh khoản thấp" },
  { asset: "Tiết kiệm", score: 55, trend: "neutral", news: "Lãi suất ổn định 5.0-5.5%/năm" },
];

const historyData = [
  { date: "11/03", score: 42 },
  { date: "12/03", score: 40 },
  { date: "13/03", score: 35 },
  { date: "14/03", score: 33 },
  { date: "15/03", score: 36 },
  { date: "16/03", score: 37 },
  { date: "17/03", score: 38 },
];

function getLabel(score: number) {
  if (score < 25) return { text: "Sợ hãi cực độ", color: "#FF5252" };
  if (score < 45) return { text: "Sợ hãi", color: "#FFAB40" };
  if (score < 55) return { text: "Trung lập", color: "#8888AA" };
  if (score < 75) return { text: "Tham lam", color: "#00E676" };
  return { text: "Tham lam cực độ", color: "#FF5252" };
}

export default function SentimentPage() {
  const label = getLabel(fearGreedScore);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold text-white mb-2">
        Fear & Greed Index <span className="text-gradient">Việt Nam</span>
      </h1>
      <p className="text-[#8888AA] mb-8">
        Chỉ số đo lường tâm lý thị trường tài chính Việt Nam, tổng hợp từ tin tức, forum và mạng xã hội.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Main gauge */}
        <div className="glass-card p-8 flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 mb-6">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#2A2A3A" strokeWidth="12" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke={label.color} strokeWidth="12"
                strokeDasharray={`${fearGreedScore * 3.14} ${314 - fearGreedScore * 3.14}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black" style={{ color: label.color }}>{fearGreedScore}</span>
              <span className="text-sm text-[#8888AA] mt-1">/ 100</span>
            </div>
          </div>
          <span className="text-lg font-semibold px-4 py-2 rounded-full" style={{ color: label.color, backgroundColor: `${label.color}15` }}>
            {label.text}
          </span>
          <p className="text-xs text-[#666680] mt-3 text-center max-w-sm">
            0 = Sợ hãi cực độ (cơ hội mua) → 100 = Tham lam cực độ (rủi ro bán tháo)
          </p>
        </div>

        {/* History */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Lịch sử 7 ngày</h3>
          <div className="space-y-3">
            {historyData.map((d) => {
              const l = getLabel(d.score);
              return (
                <div key={d.date} className="flex items-center gap-4">
                  <span className="text-sm text-[#8888AA] w-12">{d.date}</span>
                  <div className="flex-1 h-3 bg-[#2A2A3A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, backgroundColor: l.color }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right" style={{ color: l.color }}>{d.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-asset sentiment */}
      <h2 className="text-lg font-semibold text-white mb-4">Sentiment theo kênh đầu tư</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assetSentiments.map((a) => {
          const l = getLabel(a.score);
          const TrendIcon = a.trend === "up" ? TrendingUp : a.trend === "down" ? TrendingDown : Minus;
          const trendColor = a.trend === "up" ? "#00E676" : a.trend === "down" ? "#FF5252" : "#8888AA";
          return (
            <div key={a.asset} className="glass-card glass-card-hover p-5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-white">{a.asset}</span>
                <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold" style={{ color: l.color }}>{a.score}</span>
                <span className="text-xs px-2 py-1 rounded-full" style={{ color: l.color, backgroundColor: `${l.color}15` }}>
                  {l.text}
                </span>
              </div>
              <p className="text-xs text-[#666680]">{a.news}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
