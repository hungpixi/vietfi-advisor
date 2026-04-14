"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calculator, ArrowRight, MapPin, Building2, Banknote,
  Scale, Clock, HelpCircle,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

/* ─── Giá BĐS reference per khu vực ─── */
const AREA_PRICES = [
  { area: "Quận 1, HCM", type: "Căn hộ", price: 120, unit: "triệu/m²", trend: "+5.2%" },
  { area: "Quận 7, HCM", type: "Căn hộ", price: 55, unit: "triệu/m²", trend: "+3.8%" },
  { area: "Thủ Đức, HCM", type: "Căn hộ", price: 45, unit: "triệu/m²", trend: "+4.1%" },
  { area: "Cầu Giấy, HN", type: "Căn hộ", price: 65, unit: "triệu/m²", trend: "+6.0%" },
  { area: "Long Biên, HN", type: "Căn hộ", price: 38, unit: "triệu/m²", trend: "+3.2%" },
  { area: "Hải Châu, ĐN", type: "Căn hộ", price: 32, unit: "triệu/m²", trend: "+2.5%" },
  { area: "Bình Dương", type: "Căn hộ", price: 28, unit: "triệu/m²", trend: "+7.3%" },
  { area: "Nhà ở XH HCM", type: "NOXH", price: 20, unit: "triệu/m²", trend: "Ưu đãi" },
];

/* ─── NHÀ Ở XÃ HỘI data ─── */
const SOCIAL_HOUSING = [
  {
    project: "Khu dân cư Bình Chiểu",
    location: "Thủ Đức, HCM",
    price: "18-22 triệu/m²",
    status: "Đang nhận hồ sơ",
    loan: "Vay ưu đãi 4.8%/năm qua Agribank",
  },
  {
    project: "Nhà ở xã hội Thạnh Mỹ Lợi",
    location: "Quận 2, HCM",
    price: "20-25 triệu/m²",
    status: "Sắp mở bán Q2/2026",
    loan: "Vay NHCSXH 4.8%/năm, tối đa 25 năm",
  },
  {
    project: "KĐT Đặng Xá II",
    location: "Gia Lâm, HN",
    price: "16-19 triệu/m²",
    status: "Đang nhận hồ sơ",
    loan: "Vay BIDV 5.0%/năm ưu đãi 5 năm đầu",
  },
];

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function HousingIntelPage() {
  /* ── Affordability Calculator ── */
  const [income, setIncome] = useState(15_000_000);
  const [savings, setSavings] = useState(3_000_000);
  const [currentSaved, setCurrentSaved] = useState(50_000_000);
  const [targetArea, setTargetArea] = useState("Thủ Đức, HCM");
  const [apartmentSize, setApartmentSize] = useState(50); // m²

  const targetPrice = useMemo(() => {
    const found = AREA_PRICES.find(a => a.area === targetArea);
    return (found?.price ?? 45) * apartmentSize * 1_000_000; // tổng giá
  }, [targetArea, apartmentSize]);

  const downPayment = targetPrice * 0.3; // 30% đặt cọc
  const monthsToSave = useMemo(() => {
    const remaining = downPayment - currentSaved;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / savings);
  }, [downPayment, currentSaved, savings]);

  const yearsToSave = (monthsToSave / 12).toFixed(1);

  /* ── Mua vs Thuê ── */
  const [rentMonthly, setRentMonthly] = useState(7_000_000);
  const [loanRate, setLoanRate] = useState(8.5);
  const [loanYears, setLoanYears] = useState(20);

  const buyVsRent = useMemo(() => {
    const loanAmount = targetPrice * 0.7; // vay 70%
    const monthlyRate = loanRate / 100 / 12;
    const n = loanYears * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    const totalBuyCost = downPayment + monthlyPayment * n;
    const totalRentCost = rentMonthly * n;
    const breakeven = totalRentCost > 0 ? Math.ceil(downPayment / (rentMonthly - (monthlyPayment > rentMonthly ? 0 : rentMonthly - monthlyPayment))) : 0;

    return {
      monthlyPayment: Math.round(monthlyPayment),
      totalBuyCost: Math.round(totalBuyCost),
      totalRentCost: Math.round(totalRentCost),
      breakeven: Math.max(0, Math.min(breakeven, loanYears * 12)),
      chartData: [
        { name: "Chi phí mua\n(tổng)", value: Math.round(totalBuyCost / 1e9), fill: "#3B82F6" },
        { name: "Chi phí thuê\n(tổng)", value: Math.round(totalRentCost / 1e9), fill: "#F59E0B" },
      ],
    };
  }, [targetPrice, downPayment, rentMonthly, loanRate, loanYears]);

  const fmt = (n: number) => n.toLocaleString("vi-VN");

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {/* Header */}
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
          <span className="text-gradient">Housing Intel</span> — Thông tin nhà ở
        </h1>
        <p className="text-[13px] text-white/40 leading-relaxed max-w-3xl">
          Giá BĐS theo khu vực, tính khả năng mua nhà, so sánh mua vs thuê, và thông tin nhà ở xã hội.
        </p>
      </motion.div>

      {/* ═══ Giá BĐS per khu vực ═══ */}
      <motion.div variants={fadeIn} className="glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-[#8B5CF6]" />
          <h2 className="text-sm font-bold text-white">Giá BĐS theo khu vực</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-white/30 border-b border-white/[0.06]">
                <th className="text-left py-2 font-medium">Khu vực</th>
                <th className="text-left py-2 font-medium">Loại</th>
                <th className="text-right py-2 font-medium">Giá/m²</th>
                <th className="text-right py-2 font-medium">YoY</th>
              </tr>
            </thead>
            <tbody>
              {AREA_PRICES.map((a) => (
                <tr key={a.area} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 text-white/80 font-medium">{a.area}</td>
                  <td className="py-2.5 text-white/40">{a.type}</td>
                  <td className="py-2.5 text-right text-white font-semibold">{a.price} {a.unit}</td>
                  <td className="py-2.5 text-right">
                    <span className={a.trend.startsWith("+") ? "text-[#16c784]" : "text-[#f3d42f]"}>{a.trend}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ═══ 2-column: Affordability + Mua vs Thuê ═══ */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* ── Affordability Calculator ── */}
        <motion.div variants={fadeIn} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-[#3B82F6]" />
            <h2 className="text-sm font-bold text-white">Tính khả năng mua nhà</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Thu nhập/tháng</label>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-[#3B82F6]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Tiết kiệm/tháng</label>
              <input
                type="number"
                value={savings}
                onChange={(e) => setSavings(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-[#3B82F6]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Đã tích lũy</label>
              <input
                type="number"
                value={currentSaved}
                onChange={(e) => setCurrentSaved(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-[#3B82F6]/50 focus:outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-white/40 mb-1 block">Khu vực</label>
                <select
                  value={targetArea}
                  onChange={(e) => setTargetArea(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {AREA_PRICES.map((a) => (
                    <option key={a.area} value={a.area} className="bg-[#0f0f1a]">{a.area}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-white/40 mb-1 block">Diện tích (m²)</label>
                <input
                  type="number"
                  value={apartmentSize}
                  onChange={(e) => setApartmentSize(Number(e.target.value))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="mt-4 bg-gradient-to-br from-[#3B82F6]/10 to-[#8B5CF6]/10 rounded-xl p-4 border border-[#3B82F6]/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-xs text-[#3B82F6] font-semibold">KẾT QUẢ</span>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-white/50">Giá căn hộ {apartmentSize}m²</span>
                <span className="text-white font-semibold">{fmt(targetPrice)}đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Đặt cọc 30%</span>
                <span className="text-white font-semibold">{fmt(downPayment)}đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Còn thiếu</span>
                <span className="text-white font-semibold">{fmt(Math.max(0, downPayment - currentSaved))}đ</span>
              </div>
              <div className="border-t border-white/[0.08] pt-2 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-white/50">Thời gian tích lũy</span>
                  <span className="text-xl font-black text-[#3B82F6]">
                    {monthsToSave <= 0 ? "Đủ rồi! 🎉" : `~${yearsToSave} năm`}
                  </span>
                </div>
                {monthsToSave > 0 && (
                  <p className="text-[11px] text-white/30 mt-1">≈ {monthsToSave} tháng nếu tiết kiệm đều {fmt(savings)}đ/tháng</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Mua vs Thuê ── */}
        <motion.div variants={fadeIn} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-[#F59E0B]" />
            <h2 className="text-sm font-bold text-white">Mua vs Thuê</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Tiền thuê/tháng</label>
              <input type="number" value={rentMonthly} onChange={(e) => setRentMonthly(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-white/40 mb-1 block">Lãi suất vay (%)</label>
                <input type="number" step="0.1" value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-white/40 mb-1 block">Thời hạn vay (năm)</label>
                <input type="number" value={loanYears} onChange={(e) => setLoanYears(Number(e.target.value))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Bar Chart comparison */}
          <div className="h-[140px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buyVsRent.chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} unit=" tỷ" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} axisLine={false} width={90} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(15,15,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Tỷ VNĐ">
                  {buyVsRent.chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div className="mt-3 bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-white/50">Trả góp/tháng</span>
                <span className="text-white font-semibold">{fmt(buyVsRent.monthlyPayment)}đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Tổng chi phí mua ({loanYears} năm)</span>
                <span className="text-[#3B82F6] font-semibold">{(buyVsRent.totalBuyCost / 1e9).toFixed(1)} tỷ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Tổng chi phí thuê ({loanYears} năm)</span>
                <span className="text-[#F59E0B] font-semibold">{(buyVsRent.totalRentCost / 1e9).toFixed(1)} tỷ</span>
              </div>
              <div className="border-t border-white/[0.08] pt-1.5 mt-1.5">
                <p className="text-[11px] text-white/40">
                  {buyVsRent.totalBuyCost < buyVsRent.totalRentCost
                    ? `💡 Mua nhà tiết kiệm hơn ${((buyVsRent.totalRentCost - buyVsRent.totalBuyCost) / 1e9).toFixed(1)} tỷ sau ${loanYears} năm`
                    : `💡 Thuê rẻ hơn ${((buyVsRent.totalBuyCost - buyVsRent.totalRentCost) / 1e9).toFixed(1)} tỷ — nhưng không tích lũy tài sản`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ Nhà ở xã hội ═══ */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-[#16c784]" />
          <h2 className="text-sm font-bold text-white">Nhà ở xã hội — Vay ưu đãi</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {SOCIAL_HOUSING.map((h) => (
            <motion.div key={h.project} variants={fadeIn} className="glass-card p-4">
              <h3 className="text-sm font-semibold text-white mb-2">{h.project}</h3>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-white/30" />
                  <span className="text-white/50">{h.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-3 h-3 text-white/30" />
                  <span className="text-white/70 font-medium">{h.price}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3 text-white/30" />
                  <span className="text-white/50">{h.status}</span>
                </div>
              </div>
              <div className="mt-3 bg-[#16c784]/10 rounded-lg px-3 py-2 border border-[#16c784]/20">
                <span className="text-[10px] text-[#16c784] font-semibold">{h.loan}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══ Vẹt Vàng ═══ */}
      <motion.div variants={fadeIn}>
        <div className="glass-card p-4 border border-[#f3d42f]/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🦜</span>
            <div className="flex-1">
              <span className="text-xs text-[#f3d42f] font-semibold">Vẹt Vàng khuyên</span>
              <p className="text-sm text-white/60 mt-1 leading-relaxed">
                &quot;Đừng hoang mang nha! Nhà ở xã hội với vay ưu đãi 4.8% là option rất tốt cho người mới ra trường. Quan trọng là tiết kiệm đều đặn — mỗi tháng gom thêm chút, vài năm là đủ cọc! 🦜💪&quot;
              </p>
              <Link href="/dashboard/budget" className="group inline-flex items-center gap-1 text-xs text-[#f3d42f] font-medium mt-2 hover:underline">
                Lên kế hoạch tiết kiệm <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
