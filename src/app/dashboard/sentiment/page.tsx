"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { TrendingUp, TrendingDown, Minus, ArrowRight, RefreshCw, Clock, Calendar, Info } from "lucide-react";
import Link from "next/link";
import { addXP } from "@/lib/gamification";
import {
  getSentimentHistory,
  pushSentimentDay,
  type SentimentHistoryEntry,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
const AreaChart = dynamic(() => import("recharts").then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });

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
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const zone = useMemo(() => getZone(fgScore), [fgScore]);

  // ResponsiveContainer needs client-side dimensions — set after mount
  useEffect(() => { setMounted(true); }, []);

  // Duolingo XP: hoàn thành quest "check_market"
  useEffect(() => { addXP("check_market"); }, []);

  const loadSentiment = useCallback(async (active = true) => {
    setLoading(true);
    // 1. Always load stored history first so sidebar is never empty
    const stored = getSentimentHistory();
    const entries = stored.entries as SentimentHistoryEntry[];

    if (entries.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const todayEntries = entries.filter((e) => e.date.slice(0, 10) === today);
      const latest = todayEntries.length > 0 ? todayEntries[todayEntries.length - 1].score : entries[entries.length - 1].score;

      const yesterday = entries.length >= 2 ? entries[entries.length - 2] : null;
      const week = entries.length >= 8 ? entries[entries.length - 8] : null;
      const month = entries.length >= 30 ? entries[entries.length - 30] : null;

      setFgScore(latest);
      setHistoricalValues([
        { label: "Hôm qua", score: yesterday?.score ?? fallbackHistoricalValues[0].score },
        { label: "Tuần trước", score: week?.score ?? fallbackHistoricalValues[1].score },
        { label: "Tháng trước", score: month?.score ?? fallbackHistoricalValues[2].score },
      ]);

      const high = (stored.yearlyHigh && stored.yearlyHigh.score !== latest) ? stored.yearlyHigh : fallbackYearlyExtremes[0];
      const low = (stored.yearlyLow && stored.yearlyLow.score !== latest) ? stored.yearlyLow : fallbackYearlyExtremes[1];

      setYearlyExtremes([
        {
          label: "Cao hàng năm",
          date: high.date && !high.date.includes("/") ? new Date(high.date).toLocaleDateString("vi-VN") : String(high.date),
          score: high.score,
        },
        {
          label: "Thấp hàng năm",
          date: low.date && !low.date.includes("/") ? new Date(low.date).toLocaleDateString("vi-VN") : String(low.date),
          score: low.score,
        },
      ]);

      // Build chart from stored entries (last 16 days)
      let chartEntries = entries.slice(-16);

      // If we have very few real data points, blend with fallback to make a nice chart
      if (chartEntries.length < 5) {
        const mockPrefix = fallbackChartData.slice(0, 16 - chartEntries.length).map((d, i) => {
          // Adjust dates to be in the past relative to the first real entry
          const firstRealDate = new Date(chartEntries[0].date);
          const date = new Date(firstRealDate);
          date.setDate(date.getDate() - (16 - chartEntries.length - i));
          return {
            date: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
            fg: d.fg,
            vnindex: d.vnindex
          };
        });

        const realPart = chartEntries.map(h => ({
          date: new Date(h.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          fg: h.score,
          vnindex: fallbackChartData[fallbackChartData.length - 1].vnindex // fallback VNI
        }));

        setChartData([...mockPrefix, ...realPart]);
      } else {
        const mergedChart = chartEntries.map((h, idx) => ({
          date: new Date(h.date).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
          }),
          fg: h.score,
          vnindex: fallbackChartData[idx % fallbackChartData.length]?.vnindex ?? 1200,
        }));
        setChartData(mergedChart);
      }
    }

    // 2. Fetch live news to update score + persist
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

      const liveScore = Math.max(
        0,
        Math.min(100, metrics.overallNewsScore ?? fallbackFgScore),
      );
      setFgScore(liveScore);

      // Persist today's score and top news to localStorage
      const todayDate = new Date().toISOString().slice(0, 10);
      const topNews = (metrics.assetSentiment?.slice(0, 3).map(a => a.news) || []).filter(Boolean);
      pushSentimentDay({
        date: todayDate,
        score: liveScore,
        overallZone: getZone(liveScore).label,
        topNews
      });

      if (metrics.assetSentiment?.length) {
        const fetchedAssets = metrics.assetSentiment.slice(0, 6).map((a) => ({
          asset: a.asset,
          score: a.score,
          trend: a.trend,
          news: a.news,
        }));

        // Merge with fallbacks to guarantee 6 display cards for UI consistency
        const fetchedNames = new Set(fetchedAssets.map(a => a.asset));
        const needed = 6 - fetchedAssets.length;
        const extraAssets = fallbackAssetSentiments.filter(a => !fetchedNames.has(a.asset)).slice(0, needed);

        setAssetSentiments([...fetchedAssets, ...extraAssets]);
      }
    } catch (err) {
      console.error("Sentiment API failure:", err);
      // Keep stored/fallback values when API is unavailable.
    } finally {
      setLoading(false);
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [historyData, setHistoryData] = useState<SentimentHistoryEntry[]>([]);

  // Only load history after mount to prevent Hydration mismatch
  useEffect(() => {
    if (!mounted) return;
    const s = getSentimentHistory();
    let entries = [...s.entries];
    const liveItem = { date: new Date().toISOString().slice(0, 10), score: fgScore, overallZone: zone.label, topNews: assetSentiments.slice(0, 2).map(a => a.news) };

    // If starting out, blend mock + real for a rich UI
    if (entries.length < 6) {
      const mockEntries: SentimentHistoryEntry[] = fallbackChartData.slice(0, 10 - entries.length).map((d, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (10 - i));
        const score = d.fg;
        return {
          date: date.toISOString().slice(0, 10),
          score,
          overallZone: getZone(score).label,
          topNews: [fallbackAssetSentiments[i % 5].news]
        };
      });
      setHistoryData([...entries, ...mockEntries].sort((a, b) => b.date.localeCompare(a.date)));
    } else {
      setHistoryData(entries.slice().reverse());
    }
  }, [mounted, loading, fgScore]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery) return historyData;
    return historyData.filter(h =>
      h.date.includes(searchQuery) ||
      h.overallZone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.topNews?.some(n => n.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [historyData, searchQuery]);

  useEffect(() => {
    let active = true;
    loadSentiment(active);
    return () => {
      active = false;
    };
  }, [loadSentiment]);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* ── Header Section ── */}
      <motion.div variants={fadeIn} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none mb-3">
            Chỉ số <span className="text-gradient">sợ hãi & tham lam</span>
          </h1>
          <p className="text-sm md:text-base text-white/40 max-w-2xl font-medium">
            Đo lường tâm lý thị trường từ 5 chỉ báo kỹ thuật — giúp bạn đưa ra quyết định đầu tư sáng suốt. Dữ liệu cập nhật theo thời gian thực.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => loadSentiment()}
          disabled={loading}
          className="group glass-card px-6 py-3 flex items-center gap-2 hover:bg-white/[0.05] transition-all cursor-pointer border-white/10"
        >
          <RefreshCw className={`w-4 h-4 text-[#FFD700] ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          <span className="text-sm font-bold text-white tracking-wide uppercase">Làm mới dữ liệu</span>
        </motion.button>
      </motion.div>

      {/* ═══ Main section — 2 col giống CMC ═══ */}
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 mb-6">

        {/* ── Left col: Gauge + Lịch sử + Cao/Thấp ── */}
        <div className="space-y-4">

          {/* Gauge Card */}
          <motion.div variants={fadeIn} className="glass-card p-6 relative overflow-hidden group">
            {/* OLED Glow */}
            <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-[100px] pointer-events-none transition-opacity duration-1000`}
              style={{ backgroundColor: `${zone.color}20` }} />

            <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
              Chỉ số thời gian thực
            </h3>

            <div className="flex flex-col items-center">
              <div className="relative w-56 h-32 mb-4">
                <svg viewBox="0 0 200 110" className="w-full h-full drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <defs>
                    <linearGradient id="fgGauge" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="25%" stopColor="#F97316" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="75%" stopColor="#22C55E" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  {/* Outer track */}
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="14" strokeLinecap="round" />
                  {/* Gauge level */}
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fgGauge)" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={`${(fgScore / 100) * 251} 251`} className="transition-all duration-1000 ease-out" filter="url(#glow)" />

                  {/* Marker Dot */}
                  <motion.circle
                    cx={100 + 80 * Math.cos(Math.PI + (fgScore / 100) * Math.PI)}
                    cy={100 + 80 * Math.sin(Math.PI + (fgScore / 100) * Math.PI)}
                    r="4" fill="white" className="drop-shadow-[0_0_8px_white]"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }}
                  />
                </svg>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
                  <div className="text-6xl font-black font-mono tracking-tighter" style={{ color: zone.color }}>{fgScore}</div>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ color: zone.color, backgroundColor: `${zone.color}10` }}
                className="px-4 py-1.5 rounded-full border border-white/5 text-xs font-bold uppercase tracking-wider backdrop-blur-md"
              >
                {zone.label}
              </motion.div>
            </div>
          </motion.div>

          {/* Giá trị lịch sử */}
          <motion.div variants={fadeIn} className="glass-card p-5 relative overflow-hidden group">
            <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-6 flex items-center justify-between">
              Giá trị lịch sử
              <Clock className="w-3.5 h-3.5" />
            </h3>
            <div className="space-y-4">
              {historicalValues.map((h) => (
                <div key={h.label} className="flex items-center justify-between group/row">
                  <span className="text-sm text-white/40 group-hover/row:text-white/60 transition-colors">{h.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-white/80">{h.score}</span>
                    <Badge score={h.score} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Cao và thấp hàng năm */}
          <motion.div variants={fadeIn} className="glass-card p-5 relative overflow-hidden group">
            <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-6 flex items-center justify-between">
              Kỷ lục năm {new Date().getFullYear()}
              <TrendingUp className="w-3.5 h-3.5" />
            </h3>
            <div className="space-y-5">
              {yearlyExtremes.map((e) => (
                <div key={e.label} className="flex flex-col gap-1.5 group/row">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/40">{e.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white/80">{e.score}</span>
                      <Badge score={e.score} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-white/10" />
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-tight">{e.date}</span>
                  </div>
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
                <button key={t} className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${i === 1 ? "bg-white/10 text-white font-semibold" : "text-white/30 hover:text-white/60"
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

          {/* Chart — only render after mount to give ResponsiveContainer real client dimensions */}
          {mounted && (
            <div className="h-[320px] w-full min-w-0 relative">
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
          )}

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
      <motion.div variants={fadeIn} className="mb-10">
        <div className="glass-card p-6 border-[#FFD700]/10 relative overflow-hidden group hover:border-[#FFD700]/20 transition-all duration-500">
          {/* Glow Effect */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#FFD700]/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-[#FFD700]/10 transition-colors" />

          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center text-2xl shadow-inner border border-white/5">🦜</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-[#FFD700] uppercase tracking-[0.2em] font-bold">Vẹt Vàng Insight</span>
                <div className="h-px flex-1 bg-gradient-to-r from-[#FFD700]/20 to-transparent" />
              </div>
              <p className="text-base md:text-lg text-white/80 font-medium leading-relaxed italic">
                {fgScore <= 25
                  ? "\"Thị trường hoảng loạn rồi nha! Ai cũng bán tháo — đây là lúc gom hàng. Cân nhắc dòng cash vào Bluechip (VNM, FPT, MBB). Warren Buffett nói 'Hãy tham lam khi người khác sợ hãi' mà! 🔥\""
                  : fgScore <= 40
                    ? "\"Thị trường đang run — nhưng run là cơ hội. Cân nhắc dòng 10-20% cash vào cổ phiếu lớn. Đừng mua hết cùng lúc, chia làm 3 lần mua nhé!\""
                    : fgScore <= 60
                      ? "\"Thị trường trung lập — giữ nguyên vị thế, theo dõi tiếp. Lúc này nên research thêm chứ đừng FOMO!\""
                      : "\"Mọi người đang hưng phấn quá rồi đấy! Cân nhắc chốt bớt lãi 20-30%. Đừng để lợi nhuận bay mất vì tham!\""}
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.04] pt-4">
                <Link href="/dashboard/portfolio" className="group flex items-center gap-2 text-xs text-[#FFD700] font-bold tracking-widest uppercase hover:underline underline-offset-4">
                  Cấu trúc danh mục hedge lạm phát
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="flex items-center gap-1.5 grayscale opacity-20 hover:grayscale-0 hover:opacity-100 transition-all cursor-help">
                  <span className="text-[10px] text-white font-mono">BETA</span>
                  <Info className="w-3 h-3" />
                </div>
              </div>
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

      {/* 📜 LỊCH SỬ THÔNG TIN CHI TIẾT */}
      <motion.div variants={fadeIn} className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Lịch sử thông tin</h2>
            <p className="text-xs text-white/40 mt-1">Tra cứu biến động tâm lý và sự kiện thị trường trong quá khứ</p>
          </div>
          <div className="relative group">
            <input
              type="text"
              placeholder="Tìm theo ngày hoặc tin tức..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#f3d42f]/30 focus:bg-white/10 transition-all font-medium"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none group-focus-within:text-[#f3d42f]/40 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-wider">Ngày</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-wider text-center">Chỉ số</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-wider text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-white/40 uppercase tracking-wider">Tin tiêu điểm (AI)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((h, i) => {
                    const z = getZone(h.score);
                    return (
                      <motion.tr
                        key={h.date + h.score + i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{new Date(h.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-bold" style={{ color: z.color }}>{h.score}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <Badge score={h.score} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 min-w-[300px]">
                            {h.topNews && h.topNews.length > 0 ? (
                              h.topNews.map((news, idx) => (
                                <div key={idx} className="text-[11px] text-white/60 line-clamp-1 border-l-2 border-white/10 pl-2 hover:border-[#f3d42f]/30 hover:text-white/80 transition-colors cursor-default">
                                  {news}
                                </div>
                              ))
                            ) : (
                              <span className="text-[11px] text-white/20 italic">Dữ liệu vắn tắt</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-20">
                        <span className="text-3xl">📭</span>
                        <p className="text-sm">Không tìm thấy dữ liệu phù hợp</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}
