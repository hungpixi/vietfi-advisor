"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Newspaper,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

/* ─── Dummy data (sẽ thay bằng API call thực) ─── */
const sentimentScore = 38; // 0-100
const sentimentLabel = sentimentScore < 25 ? "Sợ hãi cực độ" : sentimentScore < 45 ? "Sợ hãi" : sentimentScore < 55 ? "Trung lập" : sentimentScore < 75 ? "Tham lam" : "Tham lam cực độ";
const sentimentColor = sentimentScore < 25 ? "#FF5252" : sentimentScore < 45 ? "#FFAB40" : sentimentScore < 55 ? "#8888AA" : sentimentScore < 75 ? "#00E676" : "#FF5252";

const portfolioData = [
  { name: "Tiết kiệm", value: 30, color: "#00E5FF" },
  { name: "Vàng", value: 20, color: "#FFD700" },
  { name: "Chứng khoán", value: 25, color: "#00E676" },
  { name: "Crypto", value: 10, color: "#AB47BC" },
  { name: "BĐS (REIT)", value: 15, color: "#FF6B35" },
];

const morningBrief = {
  date: "Hôm nay, 17/03/2026",
  title: "📊 Morning Brief — Thị trường thận trọng",
  summary:
    "VN-Index giảm nhẹ 0.3% phiên sáng do áp lực chốt lời nhóm ngân hàng. Vàng SJC tiếp tục lập đỉnh mới (93.5 triệu/lượng). Fed dự kiến giữ nguyên lãi suất tuần này. Dòng tiền khối ngoại vẫn bán ròng 200 tỷ.",
  keyTakeaways: [
    "🟡 Vàng: Tiếp tục tăng do lo ngại địa chính trị. Nên giữ, chưa nên mua thêm ở mức giá hiện tại.",
    "🔴 Chứng khoán: Áp lực chốt lời ngắn hạn. Cơ hội tích lũy nếu VN-Index test vùng 1,250.",
    "🟢 Tiết kiệm: Lãi suất kỳ hạn 12 tháng trung bình 5.2%/năm — vẫn thấp hơn lạm phát thực.",
    "🟣 Crypto: BTC sideway quanh $83k. Xem xét DCA nếu profile rủi ro phù hợp.",
  ],
};

const latestNews = [
  {
    title: "Vàng SJC lập đỉnh mới 93.5 triệu/lượng, chênh thế giới 18 triệu",
    source: "VnExpress",
    time: "2 giờ trước",
    sentiment: "bullish" as const,
    asset: "Vàng",
  },
  {
    title: "Fed giữ nguyên lãi suất, Powell cảnh báo rủi ro lạm phát",
    source: "CafeF",
    time: "4 giờ trước",
    sentiment: "bearish" as const,
    asset: "Chứng khoán",
  },
  {
    title: "NHNN bơm 15.000 tỷ qua OMO, tỷ giá ổn định",
    source: "NHNN",
    time: "5 giờ trước",
    sentiment: "neutral" as const,
    asset: "Tiết kiệm",
  },
  {
    title: "BTC sideway $83k, ETF Bitcoin ghi nhận dòng tiền vào 200M USD",
    source: "CoinDesk",
    time: "6 giờ trước",
    sentiment: "bullish" as const,
    asset: "Crypto",
  },
];

const sentimentMap: Record<string, { color: string; label: string }> = {
  bullish: { color: "#00E676", label: "Tích cực" },
  bearish: { color: "#FF5252", label: "Tiêu cực" },
  neutral: { color: "#8888AA", label: "Trung lập" },
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/* ─── Components ─── */

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  positive,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5 text-[#8888AA]" />
        {positive ? (
          <TrendingUp className="w-4 h-4 text-[#00E676]" />
        ) : (
          <TrendingDown className="w-4 h-4 text-[#FF5252]" />
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-sm text-[#8888AA]">{label}</span>
        <span
          className={`text-xs font-medium ${
            positive ? "text-[#00E676]" : "text-[#FF5252]"
          }`}
        >
          {change}
        </span>
      </div>
    </div>
  );
}

function SentimentGauge() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Fear & Greed Index VN</h3>
        <Link href="/dashboard/sentiment" className="text-xs text-[#FFD700] hover:underline flex items-center gap-1">
          Chi tiết <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="relative w-40 h-40">
          {/* Background circle */}
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#2A2A3A"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={sentimentColor}
              strokeWidth="10"
              strokeDasharray={`${sentimentScore * 3.14} ${314 - sentimentScore * 3.14}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: sentimentColor }}>
              {sentimentScore}
            </span>
            <span className="text-xs text-[#8888AA] mt-1">/ 100</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{
            color: sentimentColor,
            backgroundColor: `${sentimentColor}15`,
          }}
        >
          {sentimentLabel}
        </span>
      </div>
    </div>
  );
}

function PortfolioSuggestion() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Gợi ý phân bổ vốn</h3>
        <Link href="/dashboard/portfolio" className="text-xs text-[#FFD700] hover:underline flex items-center gap-1">
          Chi tiết <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={portfolioData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {portfolioData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#12121A",
                  border: "1px solid #2A2A3A",
                  borderRadius: 8,
                  color: "#F0F0F5",
                  fontSize: 12,
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => `${value}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {portfolioData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-[#8888AA]">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MorningBriefCard() {
  return (
    <div className="glass-card p-6 col-span-full glow-primary" style={{ borderColor: "rgba(255, 215, 0, 0.1)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-[#FFD700]" />
        <span className="text-xs text-[#FFD700]">{morningBrief.date}</span>
      </div>
      <h2 className="text-xl font-bold text-white mb-3">{morningBrief.title}</h2>
      <p className="text-[#8888AA] text-sm leading-relaxed mb-4">
        {morningBrief.summary}
      </p>

      <div className="space-y-2">
        {morningBrief.keyTakeaways.map((t, i) => (
          <div
            key={i}
            className="text-sm text-[#8888AA] bg-white/[0.02] rounded-lg p-3"
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsFeed() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Tin tức mới nhất</h3>
        <Link href="/dashboard/news" className="text-xs text-[#FFD700] hover:underline flex items-center gap-1">
          Xem tất cả <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {latestNews.map((news, i) => {
          const s = sentimentMap[news.sentiment];
          return (
            <div
              key={i}
              className="p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-white line-clamp-2 mb-2">
                    {news.title}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#666680]">{news.source}</span>
                    <span className="text-xs text-[#666680]">{news.time}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        color: s.color,
                        backgroundColor: `${s.color}15`,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded border border-[#2A2A3A] text-[#8888AA] flex-shrink-0">
                  {news.asset}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── PAGE ─── */
export default function DashboardOverview() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      {/* Header */}
      <motion.div variants={fadeIn} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          Xin chào! 👋
        </h1>
        <p className="text-[#8888AA]">
          Đây là tổng quan thị trường tài chính hôm nay.
        </p>
      </motion.div>

      {/* Metrics */}
      <motion.div
        variants={fadeIn}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <MetricCard
          icon={TrendingUp}
          label="VN-Index"
          value="1,268.45"
          change="-0.32%"
          positive={false}
        />
        <MetricCard
          icon={Activity}
          label="Vàng SJC"
          value="93.5tr"
          change="+1.2%"
          positive={true}
        />
        <MetricCard
          icon={Newspaper}
          label="USD/VND"
          value="25,480"
          change="+0.1%"
          positive={true}
        />
        <MetricCard
          icon={AlertTriangle}
          label="BTC"
          value="$83,450"
          change="-0.8%"
          positive={false}
        />
      </motion.div>

      {/* Morning Brief */}
      <motion.div variants={fadeIn} className="mb-6">
        <MorningBriefCard />
      </motion.div>

      {/* Grid: Sentiment + Portfolio + News */}
      <motion.div
        variants={fadeIn}
        className="grid lg:grid-cols-3 gap-6"
      >
        <SentimentGauge />
        <PortfolioSuggestion />
        <NewsFeed />
      </motion.div>
    </motion.div>
  );
}
