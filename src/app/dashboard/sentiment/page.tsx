"use client";

import { useEffect } from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { addXP } from "@/lib/gamification";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ─── Fallback Data ─── */
const fallbackFgScore = 29;

/* Chart data — 30 ngày gần nhất */
const fallbackChartData = [
  { date: "15/02", fg: 55, vnindex: 1280 }, { date: "17/02", fg: 52, vnindex: 1275 },
  { date: "19/02", fg: 48, vnindex: 1260 }, { date: "21/02", fg: 42, vnindex: 1248 },
  { date: "23/02", fg: 38, vnindex: 1235 }, { date: "25/02", fg: 35, vnindex: 1228 },
  { date: "27/02", fg: 30, vnindex: 1220 }, { date: "01/03", fg: 28, vnindex: 1215 },
  { date: "03/03", fg: 22, vnindex: 1198 }, { date: "05/03", fg: 18, vnindex: 1185 },
  { date: "07/03", fg: 11, vnindex: 1170 }, { date: "09/03", fg: 15, vnindex: 1178 },
  { date: "11/03", fg: 22, vnindex: 1190 }, { date: "13/03", fg: 28, vnindex: 1205 },
  { date: "15/03", fg: 34, vnindex: 1215 }, { date: "17/03", fg: 29, vnindex: 1208 },
];

const fallbackHistoricalValues = [
  { label: "Hôm qua", score: 34 },
  { label: "Tuần trước", score: 28 },
  { label: "Tháng trước", score: 11 },
];

const fallbackYearlyExtremes = [
  { label: "Cao hàng năm", date: "May 23, 2025", score: 76 },
  { label: "Thấp hàng năm", date: "Feb 06, 2026", score: 5 },
];

const fallbackAssetSentiments = [
  { asset: "Chứng khoán", score: 32, trend: "down" as const, news: "Khối ngoại bán ròng, VN-Index giảm nhẹ" },
  { asset: "Vàng", score: 72, trend: "up" as const, news: "Vàng lập đỉnh mới, nhu cầu trú ẩn tăng" },
  { asset: "Crypto", score: 48, trend: "neutral" as const, news: "BTC sideway, ETF dòng tiền vào ổn định" },
  { asset: "BĐS", score: 28, trend: "down" as const, news: "Thị trường trầm lắng, thanh khoản thấp" },
  { asset: "Tiết kiệm", score: 55, trend: "neutral" as const, news: "Lãi suất ổn định 5.0-5.5%/năm" },
];

function getZone(score: number) {
  if (score <= 20) return { label: "Cực kỳ Sợ hãi", color: "#ea3943" };
  if (score <= 40) return { label: "Sợ hãi", color: "#ea3943" };
  if (score <= 60) return { label: "Bình thường", color: "#f3d42f" };
  if (score <= 80) return { label: "Tham lam", color: "#16c784" };
  return { label: "Cực kỳ Tham lam", color: "#16c784" };
}

/* Badge component — giống CMC */
function Badge({ score }: { score: number }) {
  const z = getZone(score);
  const isExtremeFear = score <= 20;
  const isExtreme = isExtremeFear || score > 80;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
      style={{
        color: isExtreme ? "#fff" : z.color,
        backgroundColor: isExtreme ? z.color : `${z.color}18`,
      }}
    >
      {z.label} - {score}
    </span>
  );
}

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function SentimentPage() {
  const [fgScore, setFgScore] = useState(fallbackFgScore);
  const [chartData, setChartData] = useState(fallbackChartData);
  const [historicalValues, setHistoricalValues] = useState(fallbackHistoricalValues);
  const [yearlyExtremes, setYearlyExtremes] = useState(fallbackYearlyExtremes);
  const [assetSentiments, setAssetSentiments] = useState(fallbackAssetSentiments);

  const zone = useMemo(() => getZone(fgScore), [fgScore]);

  // Duolingo XP: hoàn thành quest "check_market"
  useEffect(() => { addXP("check_market"); }, []);

  useEffect(() => {
    let active = true;

    const loadSentiment = async () => {
      try {
        const resp = await fetch("/api/news", { cache: "no-store" });
        if (!resp.ok) throw new Error("Cannot load sentiment");

        const payload = (await resp.json()) as {
          metrics?: {
            overallNewsScore: number;
            history: Array<{ date: string; score: number }>;
            assetSentiment: Array<{
              asset: string;
              score: number;
              trend: "up" | "down" | "neutral";
              news: string;
            }>;
          };
        };

        const metrics = payload.metrics;
        if (!active || !metrics) return;

        const safeScore = Math.max(0, Math.min(100, metrics.overallNewsScore ?? fallbackFgScore));
        setFgScore(safeScore);

        const history = metrics.history ?? [];
        if (history.length > 0) {
          const mergedChart = history.slice(-16).map((h, idx) => ({
            date: new Date(h.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
            fg: h.score,
            vnindex: fallbackChartData[idx % fallbackChartData.length]?.vnindex ?? 1200,
          }));
          setChartData(mergedChart);

          const latest = history[history.length - 1];
          const prev = history[history.length - 2] ?? latest;
          const week = history[Math.max(0, history.length - 8)] ?? prev;
          const month = history[0] ?? week;

          setHistoricalValues([
            { label: "Hôm qua", score: prev.score },
            { label: "Tuần trước", score: week.score },
            { label: "Tháng trước", score: month.score },
          ]);

          const maxItem = history.reduce((best, item) => (item.score > best.score ? item : best), history[0]);
          const minItem = history.reduce((best, item) => (item.score < best.score ? item : best), history[0]);

          setYearlyExtremes([
            {
              label: "Cao hàng năm",
              date: new Date(maxItem.date).toLocaleDateString("vi-VN"),
              score: maxItem.score,
            },
            {
              label: "Thấp hàng năm",
              date: new Date(minItem.date).toLocaleDateString("vi-VN"),
              score: minItem.score,
            },
          ]);
        }

        if (metrics.assetSentiment?.length) {
          setAssetSentiments(
            metrics.assetSentiment.slice(0, 6).map((a) => ({
              asset: a.asset,
              score: a.score,
              trend: a.trend,
              news: a.news,
            })),
          );
        }
      } catch {
        // Keep fallback values when API is unavailable.
      }
    };

    loadSentiment();

    return () => {
      active = false;
    };
  }, []);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {/* ─── Header ─── */}
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
          Chỉ số sợ hãi và tham lam của <span className="text-gradient">thị trường Việt Nam</span>
        </h1>
        <p className="text-[13px] text-white/40 leading-relaxed max-w-3xl">
          Đo lường tâm lý thị trường từ 5 chỉ báo — giúp bạn đưa ra quyết định đầu tư sáng suốt.
          Dữ liệu cập nhật hàng ngày.
        </p>
      </motion.div>

      {/* ═══ Main section — 2 col giống CMC ═══ */}
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 mb-6">

        {/* ── Left col: Gauge + Lịch sử + Cao/Thấp ── */}
        <div className="space-y-4">

          {/* Gauge Card */}
          <motion.div variants={fadeIn} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white/60 mb-4">
              Chỉ số sợ hãi và tham lam
            </h3>
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-28 mb-2">
                <svg viewBox="0 0 200 110" className="w-full h-full">
                  <defs>
                    <linearGradient id="fgGauge" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ea3943" />
                      <stop offset="25%" stopColor="#ea3943" />
                      <stop offset="45%" stopColor="#f3d42f" />
                      <stop offset="55%" stopColor="#f3d42f" />
                      <stop offset="75%" stopColor="#16c784" />
                      <stop offset="100%" stopColor="#16c784" />
                    </linearGradient>
                  </defs>
                  {/* Background arc */}
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fgGauge)" strokeWidth="10" strokeLinecap="round" opacity="0.2" />
                  {/* Foreground arc */}
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fgGauge)" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(fgScore / 100) * 251} 251`} />
                  {/* End caps chỉ hiển thị nhãn 0 và 100 */}
                </svg>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                  <div className="text-5xl font-black" style={{ color: zone.color }}>{fgScore}</div>
                </div>
              </div>
              <span className="text-sm font-medium mt-1" style={{ color: zone.color }}>
                {zone.label}
              </span>
            </div>
          </motion.div>

          {/* Giá trị lịch sử — giống CMC */}
          <motion.div variants={fadeIn} className="glass-card p-5">
            <h3 className="text-sm font-bold text-white mb-4">Giá trị lịch sử</h3>
            <div className="space-y-3">
              {historicalValues.map((h) => (
                <div key={h.label} className="flex items-center justify-between">
                  <span className="text-sm text-white/50">{h.label}</span>
                  <Badge score={h.score} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Cao và thấp hàng năm */}
          <motion.div variants={fadeIn} className="glass-card p-5">
            <h3 className="text-sm font-bold text-white mb-4">Cao và thấp hàng năm</h3>
            <div className="space-y-3">
              {yearlyExtremes.map((e) => (
                <div key={e.label} className="flex items-center justify-between">
                  <span className="text-sm text-white/50">
                    {e.label} <span className="text-white/25">({e.date})</span>
                  </span>
                  <Badge score={e.score} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Right col: Chart lớn — giống CMC ── */}
        <motion.div variants={fadeIn} className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Biểu đồ chỉ số sợ hãi và tham lam</h3>
            <div className="flex gap-1">
              {["7N", "30N", "1N", "Tất cả"].map((t, i) => (
                <button key={t} className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                  i === 1 ? "bg-white/10 text-white font-semibold" : "text-white/30 hover:text-white/60"
                }`}>{t}</button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mb-4 text-[11px] text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f3d42f]" /> Chỉ số F&G
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/30" /> VN-Index
            </span>
          </div>

          {/* Chart */}
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f3d42f" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f3d42f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="fg" domain={[0, 100]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false}
                  orientation="right" />
                <YAxis yAxisId="vni" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.15)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(15,15,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                />
                <Area yAxisId="vni" type="monotone" dataKey="vnindex" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} fill="none" name="VN-Index" />
                <Area yAxisId="fg" type="monotone" dataKey="fg" stroke="#f3d42f" strokeWidth={2} fill="url(#fgGrad)" name="Fear & Greed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Scale labels bên phải chart — giống CMC */}
          <div className="flex justify-end mt-2">
            <div className="flex items-center gap-3 text-[10px]">
              <span style={{ color: "#16c784" }}>Cực kỳ Tham lam</span>
              <span style={{ color: "#16c784" }}>Tham lam</span>
              <span style={{ color: "#f3d42f" }}>Bình thường</span>
              <span style={{ color: "#ea3943" }}>Sợ hãi</span>
              <span style={{ color: "#ea3943" }}>Cực kỳ Sợ hãi</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ Vẹt Vàng gợi ý ═══ */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className="glass-card p-4 border border-[#f3d42f]/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🦜</span>
            <div className="flex-1">
              <span className="text-xs text-[#f3d42f] font-semibold">Vẹt Vàng gợi ý</span>
              <p className="text-sm text-white/60 mt-1 leading-relaxed">
                {fgScore <= 25
                  ? "\"Thị trường hoảng loạn rồi nha! Ai cũng bán tháo — đây là lúc gom hàng. Cân nhắc dòng cash vào Bluechip (VNM, FPT, MBB). Warren Buffett nói 'Hãy tham lam khi người khác sợ hãi' mà! 🦜🔥\""
                  : fgScore <= 40
                  ? "\"Thị trường đang run — nhưng run là cơ hội. Cân nhắc dòng 10-20% cash vào cổ phiếu lớn. Đừng mua hết cùng lúc, chia làm 3 lần mua nhé! 🦜\""
                  : fgScore <= 60
                  ? "\"Thị trường trung lập — giữ nguyên vị thế, theo dõi tiếp. Lúc này nên research thêm chứ đừng FOMO! 🦜\""
                  : "\"Mọi người đang hưng phấn quá rồi đấy! Cân nhắc chốt bớt lãi 20-30%. Đừng để lợi nhuận bay mất vì tham! 🦜\""}
              </p>
              <Link href="/dashboard/portfolio" className="group inline-flex items-center gap-1 text-xs text-[#f3d42f] font-medium mt-2 hover:underline">
                Xem gợi ý danh mục <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ Tâm lý theo kênh đầu tư + HÀNH ĐỘNG ═══ */}
      <motion.div variants={fadeIn}>
        <h2 className="text-sm font-bold text-white mb-3">Tâm lý theo kênh đầu tư</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assetSentiments.map((a) => {
            const z = getZone(a.score);
            const TrendIcon = a.trend === "up" ? TrendingUp : a.trend === "down" ? TrendingDown : Minus;
            const trendColor = a.trend === "up" ? "#16c784" : a.trend === "down" ? "#ea3943" : "#8B8D96";
            // Action badge based on score
            const action = a.score <= 25 ? { label: "🟢 CƠ HỘI MUA", color: "#22C55E", tip: "Giá rẻ — cân nhắc tích lũy dần" }
              : a.score <= 40 ? { label: "🟡 THEO DÕI", color: "#f3d42f", tip: "Chưa quá rẻ — đợi thêm hoặc mua nhỏ" }
              : a.score <= 60 ? { label: "⚪ GIỮ", color: "#8B8D96", tip: "Trung lập — giữ vị thế hiện tại" }
              : a.score <= 80 ? { label: "🟠 CẨN THẬN", color: "#FF6B35", tip: "Đang nóng — cân nhắc chốt lãi 1 phần" }
              : { label: "🔴 QUÁ NÓNG", color: "#EF4444", tip: "Tránh mua đuổi — chốt lãi nếu có" };
            return (
              <motion.div key={a.asset} variants={fadeIn} className="glass-card glass-card-hover p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{a.asset}</span>
                  <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold" style={{ color: z.color }}>{a.score}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: z.color, backgroundColor: `${z.color}15` }}>{z.label}</span>
                </div>
                {/* Action badge */}
                <div className="mb-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ color: action.color, backgroundColor: `${action.color}15` }}>
                    {action.label}
                  </span>
                  <p className="text-[10px] text-white/30 mt-1">{action.tip}</p>
                </div>
                <p className="text-[11px] text-white/30">{a.news}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 🎯 RADAR CƠ HỘI */}
      <motion.div variants={fadeIn} className="mt-6 glass-card p-5 border-[#22C55E]/10 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#22C55E]/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h3 className="text-sm font-bold text-[#22C55E]">Radar Cơ Hội</h3>
          </div>
          <div className="space-y-2">
            {/* Opportunities */}
            {assetSentiments.filter(a => a.score <= 30).length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-xs bg-[#22C55E]/15 text-[#22C55E] px-1.5 py-0.5 rounded font-bold shrink-0">MUA</span>
                <p className="text-[13px] text-white/60">
                  {assetSentiments.filter(a => a.score <= 30).map(a => <strong key={a.asset} className="text-white/80">{a.asset}</strong>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`}>, </span>, curr], [] as React.ReactNode[])}
                  {" "}đang ở vùng Sợ hãi — cơ hội tích lũy nếu bạn có vốn dư
                </p>
              </div>
            )}
            {/* Risks */}
            {assetSentiments.filter(a => a.score >= 70).length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-xs bg-[#EF4444]/15 text-[#EF4444] px-1.5 py-0.5 rounded font-bold shrink-0">CẨN THẬN</span>
                <p className="text-[13px] text-white/60">
                  {assetSentiments.filter(a => a.score >= 70).map(a => <strong key={a.asset} className="text-white/80">{a.asset}</strong>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, <span key={`sep-${i}`}>, </span>, curr], [] as React.ReactNode[])}
                  {" "}đang quá nóng — tránh mua đuổi, chốt lãi nếu có
                </p>
              </div>
            )}
            {/* Neutral */}
            {assetSentiments.every(a => a.score > 30 && a.score < 70) && (
              <div className="flex items-start gap-2">
                <span className="text-xs bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-bold shrink-0">TRUNG TÍNH</span>
                <p className="text-[13px] text-white/60">Không có kênh nào ở vùng cực đoan — giữ vị thế hiện tại, theo dõi tin tức</p>
              </div>
            )}
          </div>
          <a href="/dashboard/portfolio" className="inline-flex items-center gap-1.5 text-[11px] text-[#22C55E] hover:text-[#16c784] transition-colors mt-3 font-medium">
            Xem phân bổ vốn phù hợp → 
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
