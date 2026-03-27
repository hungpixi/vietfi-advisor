"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, ArrowRight, BarChart3,
  Sparkles, Target, Building2, Coins, Bitcoin, LineChart,
} from "lucide-react";
import Link from "next/link";
import { addXP } from "@/lib/gamification";
import { getRiskResult, getIncome, getBudgetPots, getDebts } from "@/lib/storage";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ─── Types ─── */
interface AssetCard {
  asset: string;
  icon: typeof TrendingUp;
  price: string;
  change: number;
  score: number;
  trend: "up" | "down" | "neutral";
  summary: string;
  action: string;
  color: string;
}

interface Opportunity {
  title: string;
  description: string;
  asset: string;
  signal: "buy" | "hold" | "sell";
  confidence: number;
}

/* ─── Utils ─── */
function getZone(score: number) {
  if (score <= 20) return { label: "Cực kỳ Sợ hãi", color: "#ea3943" };
  if (score <= 40) return { label: "Sợ hãi", color: "#ea3943" };
  if (score <= 60) return { label: "Bình thường", color: "#f3d42f" };
  if (score <= 80) return { label: "Tham lam", color: "#16c784" };
  return { label: "Cực kỳ Tham lam", color: "#16c784" };
}

function signalBadge(signal: "buy" | "hold" | "sell") {
  const map = {
    buy: { label: "MUA", bg: "#16c784", text: "#fff" },
    hold: { label: "GIỮ", bg: "#f3d42f", text: "#000" },
    sell: { label: "BÁN", bg: "#ea3943", text: "#fff" },
  };
  return map[signal];
}

/* ─── Fallback Data ─── */
const fallbackAssets: AssetCard[] = [
  {
    asset: "Chứng khoán",
    icon: LineChart,
    price: "1,208.5",
    change: -0.35,
    score: 32,
    trend: "down",
    summary: "VN-Index vùng Fear, khối ngoại bán ròng. P/E thấp hơn trung bình 5 năm → cơ hội tích lũy blue-chip.",
    action: "DCA nhóm VN30 (FPT, VNM, MBB). Chia 3 đợt mua, mỗi đợt 1/3 vốn.",
    color: "#3B82F6",
  },
  {
    asset: "Vàng SJC",
    icon: Coins,
    price: "92,500,000",
    change: 1.2,
    score: 72,
    trend: "up",
    summary: "Vàng lập đỉnh mới do nhu cầu trú ẩn tăng. Chênh lệch SJC-thế giới ~15 triệu.",
    action: "Giữ nếu đang có. Mua mới cân nhắc vàng nhẫn thay SJC (chênh lệch thấp hơn).",
    color: "#F59E0B",
  },
  {
    asset: "Bất động sản",
    icon: Building2,
    price: "45-65tr/m²",
    change: -2.1,
    score: 28,
    trend: "down",
    summary: "TP.HCM thanh khoản thấp. Nhà ở xã hội có chính sách vay ưu đãi 4.8%/năm.",
    action: "Chưa nên mua đầu tư. Nếu ở thực → xem nhà ở xã hội + vay ưu đãi Agribank.",
    color: "#8B5CF6",
  },
  {
    asset: "Bitcoin",
    icon: Bitcoin,
    price: "$67,430",
    change: 0.8,
    score: 48,
    trend: "neutral",
    summary: "BTC sideway, ETF dòng tiền vào ổn định. Halving effect đang phản ánh dần.",
    action: "DCA 5-10% portfolio. Altcoin chỉ nên chạm khi BTC phá ATH.",
    color: "#F97316",
  },
];

const fallbackOpportunities: Opportunity[] = [
  {
    title: "VN-Index vùng Fear + P/E thấp",
    description: "Chỉ số sợ hãi 32/100 + P/E trung bình VN30 ở mức 12.5x (thấp hơn trung bình 5 năm 14.2x). Cơ hội DCA cổ phiếu blue-chip với discount.",
    asset: "Chứng khoán",
    signal: "buy",
    confidence: 75,
  },
  {
    title: "Vàng nhẫn spread thấp",
    description: "Chênh lệch vàng nhẫn - thế giới chỉ 3-5 triệu, thấp hơn SJC (15 triệu). Nếu muốn phòng hộ lạm phát, vàng nhẫn hiệu quả hơn.",
    asset: "Vàng",
    signal: "buy",
    confidence: 65,
  },
  {
    title: "BĐS TP.HCM thanh khoản thấp",
    description: "Giao dịch giảm 40% so với cùng kỳ. Không phải thời điểm đầu tư BĐS, nhưng nếu mua ở thực có thể thương lượng giá tốt hơn bình thường 10-15%.",
    asset: "BĐS",
    signal: "hold",
    confidence: 55,
  },
];

const fallbackTrendData = [
  { date: "01/03", vnindex: 1215, gold: 88.5, btc: 62.1 },
  { date: "03/03", vnindex: 1198, gold: 89.2, btc: 63.5 },
  { date: "05/03", vnindex: 1185, gold: 89.8, btc: 61.8 },
  { date: "07/03", vnindex: 1170, gold: 90.5, btc: 64.2 },
  { date: "09/03", vnindex: 1178, gold: 91.0, btc: 65.0 },
  { date: "11/03", vnindex: 1190, gold: 91.2, btc: 66.3 },
  { date: "13/03", vnindex: 1205, gold: 91.8, btc: 65.8 },
  { date: "15/03", vnindex: 1215, gold: 92.0, btc: 66.0 },
  { date: "17/03", vnindex: 1208, gold: 92.5, btc: 67.4 },
  { date: "19/03", vnindex: 1212, gold: 92.3, btc: 66.8 },
];

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function MarketDeepDivePage() {
  const [assets, setAssets] = useState(fallbackAssets);
  const [opportunities, setOpportunities] = useState(fallbackOpportunities);
  const [trendData, setTrendData] = useState(fallbackTrendData);
  const [activeChart, setActiveChart] = useState<"vnindex" | "gold" | "btc">("vnindex");

  const [freeCashflow, setFreeCashflow] = useState(0);
  const [riskType, setRiskType] = useState("balanced");

  useEffect(() => { 
    addXP("check_market"); 
    
    // Tính Free Cashflow & Lấy Risk DNA
    const income = getIncome();
    const pots = getBudgetPots();
    const debts = getDebts();
    const essentials = pots.filter(p => ['Ăn uống', 'Nhà cửa', 'Đi lại', 'Hoá đơn', 'Sức khoẻ'].some(k => p.name.includes(k))).reduce((sum, p) => sum + p.allocated, 0);
    const essentialExpense = essentials > 0 ? essentials : pots.reduce((sum, p) => sum + p.allocated, 0) * 0.5;
    const debtMin = debts.reduce((sum, d) => sum + d.min_payment, 0);
    setFreeCashflow(income - essentialExpense - debtMin);

    const risk = getRiskResult();
    if (risk) {
      if (risk.score <= 6) setRiskType("conservative");
      else if (risk.score <= 10) setRiskType("balanced");
      else setRiskType("growth");
    }
  }, []);

  // Try loading live market data
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resp = await fetch("/api/market-data", { cache: "no-store" });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!active || !data) return;

        // Update assets with live data if available
        // API trả về: vnIndex: { price, change, changePct }, goldSjc: { goldVnd, changePct }, btcUsdt: { priceUsd, changePct24h }
        const vni = data.vnIndex;
        const gold = data.goldSjc;
        const btc = data.btcUsdt;
        if (vni || gold || btc) {
          setAssets(prev => prev.map(a => {
            if (a.asset === "Chứng khoán" && vni?.price) {
              return { ...a, price: vni.price.toLocaleString("vi-VN"), change: vni.changePct ?? a.change };
            }
            if (a.asset === "Vàng SJC" && gold?.goldVnd) {
              return { ...a, price: gold.goldVnd.toLocaleString("vi-VN"), change: gold.changePct ?? a.change };
            }
            if (a.asset === "Bitcoin" && btc?.priceUsd) {
              return { ...a, price: `$${btc.priceUsd.toLocaleString("en-US")}`, change: btc.changePct24h ?? a.change };
            }
            return a;
          }));
        }
      } catch { /* fallback */ }
    })();
    return () => { active = false; };
  }, []);

  const chartConfig = {
    vnindex: { key: "vnindex", label: "VN-Index", color: "#3B82F6", unit: "" },
    gold: { key: "gold", label: "Vàng (triệu)", color: "#F59E0B", unit: "tr" },
    btc: { key: "btc", label: "BTC (nghìn $)", color: "#F97316", unit: "K" },
  }[activeChart];

  const getDynamicFlashAlert = () => {
    if (freeCashflow < 0) {
      return {
        type: 'danger',
        msg: `Dòng tiền đang ÂM ${Math.abs(freeCashflow).toLocaleString('vi-VN')}đ! Đừng nhìn chằm chằm vào thị trường nữa, quay về "Trung Tâm Nợ" cày cuốc hoặc cắt giảm chi tiêu ngay!`,
        icon: "🚨"
      };
    }
    if (freeCashflow === 0) {
      return {
        type: 'warning',
        msg: `Dư địa đầu tư đang là 0đ. Rủi ro trắng tay cực cao, hãy tạo dòng tiền dương trước khi săn cơ hội!`,
        icon: "⏳"
      };
    }
    
    if (riskType === 'conservative') {
      return {
        type: 'safe',
        msg: `Với dòng tiền dư ${freeCashflow.toLocaleString('vi-VN')}đ và DNA "Bảo Thủ": Tốt nhất là bơm qua Sổ Tiết Kiệm hoặc Vàng Nhẫn. Bỏ qua Cổ phiếu & Crypto khúc biến động này.`,
        icon: "🛡️"
      };
    } else if (riskType === 'balanced') {
      return {
        type: 'balanced',
        msg: `Dư địa rảnh tay ${freeCashflow.toLocaleString('vi-VN')}đ. Nhặt một ít Chứng Chỉ Quỹ ETF VN30 hoặc Gom Vàng lúc điều chỉnh, đừng FOMO All-in.`,
        icon: "⚖️"
      };
    } else {
      return {
        type: 'aggressive',
        msg: `Dư địa ${freeCashflow.toLocaleString('vi-VN')}đ + Khẩu vị Tăng Trưởng: VN-Index đang Sợ Hãi (Fear) là lúc múc Cổ Phiếu Bluechip giá Sale! Chờ gì nữa múc đi ba!`,
        icon: "🚀"
      };
    }
  };

  const alert = getDynamicFlashAlert();

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {/* Header */}
      <motion.div variants={fadeIn} className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
          Phân Tích <span className="text-gradient">Thị Trường</span>
        </h1>
        <p className="text-[13px] text-white/40 leading-relaxed max-w-3xl">
          Phân tích sâu 4 kênh đầu tư — Chứng khoán, Vàng, BĐS, Crypto. Trạng thái hiện tại, cơ hội, và hành động gợi ý.
        </p>
      </motion.div>

      {/* ═══ FLASH ALERT THEO RISK DNA ═══ */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)]
          ${alert.type === 'danger' ? 'bg-[#EF4444]/15 border-[#EF4444]/30' : 
            alert.type === 'warning' ? 'bg-[#F59E0B]/15 border-[#F59E0B]/30' : 
            alert.type === 'safe' ? 'bg-[#00E5FF]/15 border-[#00E5FF]/30' : 
            alert.type === 'balanced' ? 'bg-[#22C55E]/15 border-[#22C55E]/30' : 
            'bg-gradient-to-r from-[#FF6B35]/20 to-[#AB47BC]/20 border-[#FF6B35]/30'}`}>
           <span className="text-2xl shrink-0 mt-0.5">{alert.icon}</span>
           <div>
             <span className={`text-[10px] font-bold uppercase tracking-wider 
               ${alert.type === 'danger' ? 'text-[#EF4444]' : 
                 alert.type === 'warning' ? 'text-[#F59E0B]' : 
                 alert.type === 'safe' ? 'text-[#00E5FF]' : 
                 alert.type === 'balanced' ? 'text-[#22C55E]' : 
                 'text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B35] to-[#E6B84F]'}`}>
               VẸT VÀNG PHÍM HÀNG DỰA TRÊN DÒNG TIỀN CỦA BẠN
             </span>
             <p className="text-sm font-medium text-white/90 leading-relaxed mt-1">
               {alert.msg}
             </p>
           </div>
        </div>
      </motion.div>

      {/* ═══ 4 Asset Cards ═══ */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {assets.map((a) => {
          const zone = getZone(a.score);
          const TrendIcon = a.trend === "up" ? TrendingUp : a.trend === "down" ? TrendingDown : Minus;
          const trendColor = a.trend === "up" ? "#16c784" : a.trend === "down" ? "#ea3943" : "#8B8D96";
          const Icon = a.icon;

          return (
            <motion.div key={a.asset} variants={fadeIn} className="glass-card p-5 transition-all">
              {/* Title row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${a.color}20` }}>
                    <Icon className="w-4 h-4" style={{ color: a.color }} />
                  </div>
                  <span className="text-sm font-semibold text-white">{a.asset}</span>
                </div>
                <span
                  className="text-[10px] px-2 py-1 rounded-full font-medium"
                  style={{ color: zone.color, backgroundColor: `${zone.color}15` }}
                >
                  {zone.label}
                </span>
              </div>

              {/* Price row */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-lg font-bold text-white">{a.price}</span>
                <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: trendColor }}>
                  <TrendIcon className="w-3 h-3" />
                  {a.change > 0 ? "+" : ""}{a.change.toFixed(2)}%
                </span>
              </div>

              {/* Summary */}
              <p className="text-[12px] text-white/50 leading-relaxed mb-3">{a.summary}</p>

              {/* Action */}
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-[#f3d42f]" />
                  <span className="text-[10px] text-[#f3d42f] font-semibold">HÀNH ĐỘNG GỢI Ý</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">{a.action}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══ Trend Chart ═══ */}
      <motion.div variants={fadeIn} className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Xu hướng giá — 20 ngày</h3>
          <div className="flex gap-1">
            {(["vnindex", "gold", "btc"] as const).map((k) => {
              const cfg = {
                vnindex: { label: "VN-Index", c: "#3B82F6" },
                gold: { label: "Vàng", c: "#F59E0B" },
                btc: { label: "BTC", c: "#F97316" },
              }[k];
              return (
                <button
                  key={k}
                  onClick={() => setActiveChart(k)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg transition-colors font-medium ${
                    activeChart === k
                      ? "text-white"
                      : "text-white/30 hover:text-white/60"
                  }`}
                  style={activeChart === k ? { backgroundColor: `${cfg.c}25`, color: cfg.c } : undefined}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartConfig.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartConfig.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(15,15,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }}
              />
              <Area
                type="monotone"
                dataKey={chartConfig.key}
                stroke={chartConfig.color}
                strokeWidth={2}
                fill="url(#chartGrad)"
                name={chartConfig.label}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ═══ Opportunity Radar ═══ */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#f3d42f]" />
          <h2 className="text-sm font-bold text-white">Cơ hội Radar — AI nhận diện</h2>
        </div>

        <div className="space-y-3">
          {opportunities.map((opp, i) => {
            const badge = signalBadge(opp.signal);
            return (
              <motion.div key={i} variants={fadeIn} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{opp.title}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/30">{opp.asset}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/40">Độ tin cậy</span>
                    <div className="text-sm font-bold text-white">{opp.confidence}%</div>
                  </div>
                </div>
                <p className="text-[12px] text-white/50 leading-relaxed">{opp.description}</p>
                {/* Confidence bar */}
                <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${opp.confidence}%`,
                      backgroundColor: badge.bg,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ Vẹt Vàng CTA ═══ */}
      <motion.div variants={fadeIn}>
        <div className="glass-card p-4 border border-[#f3d42f]/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🦜</span>
            <div className="flex-1">
              <span className="text-xs text-[#f3d42f] font-semibold">Vẹt Vàng tổng kết</span>
              <p className="text-sm text-white/60 mt-1 leading-relaxed">
                &quot;Thị trường đang vùng Sợ hãi — đây thường là lúc người giỏi ra tay. Nhưng nhớ: DCA chứ đừng All-in! Mở Cố vấn Danh mục để xem phân bổ phù hợp nha 🦜🔥&quot;
              </p>
              <Link href="/dashboard/portfolio" className="group inline-flex items-center gap-1 text-xs text-[#f3d42f] font-medium mt-2 hover:underline">
                Mở Cố vấn Danh mục <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
