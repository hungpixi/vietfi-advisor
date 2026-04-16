"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Building2, Banknote,
  Clock, HelpCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

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
        { name: "MUA", value: Math.round(totalBuyCost / 1e9), fill: "#22C55E" },
        { name: "THUÊ", value: Math.round(totalRentCost / 1e9), fill: "#E6B84F" },
      ],
    };
  }, [targetPrice, downPayment, rentMonthly, loanRate, loanYears]);

  const fmt = (n: number) => n.toLocaleString("vi-VN");

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {/* Header */}
      <motion.div variants={fadeIn} className="mb-6">
        <CyberHeader size="display">Housing <span className="text-[#22C55E]">Intel</span></CyberHeader>
        <CyberSubHeader className="mt-1">
          Dữ liệu thị trường BĐS &amp; Phân tích tài chính mua nhà cho thế hệ mới
        </CyberSubHeader>
      </motion.div>

      {/* ═══ Giá BĐS per khu vực ═══ */}
      <CyberCard className="p-5 mb-6" showDecorators={false}>
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-4 h-4 text-[#22C55E]" />
          <CyberHeader size="xs">Giá BĐS theo khu vực</CyberHeader>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                <th className="text-left py-4 px-2"><CyberSubHeader>Khu vực</CyberSubHeader></th>
                <th className="text-left py-4 px-2"><CyberSubHeader>Loại</CyberSubHeader></th>
                <th className="text-right py-4 px-2"><CyberSubHeader>Giá/m²</CyberSubHeader></th>
                <th className="text-right py-4 px-2"><CyberSubHeader>YOY</CyberSubHeader></th>
              </tr>
            </thead>
            <tbody>
              {AREA_PRICES.map((a) => (
                <tr key={a.area} className="border-b border-white/[0.03] hover:bg-[#22C55E]/[0.02] transition-colors group">
                  <td className="py-4 px-2">
                    <CyberTypography size="xs" className="text-white font-black">{a.area}</CyberTypography>
                  </td>
                  <td className="py-4 px-2"><CyberSubHeader>{a.type.toUpperCase()}</CyberSubHeader></td>
                  <td className="py-4 px-2 text-right">
                    <CyberTypography size="xs" variant="mono" className="text-white">{a.price} {a.unit.toUpperCase()}</CyberTypography>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <span className={cn("font-mono text-[11px] font-black", a.trend.startsWith("+") ? "text-[#22C55E]" : "text-[#E6B84F]")}>
                      {a.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CyberCard>

      {/* ═══ 2-column: Affordability + Mua vs Thuê ═══ */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* ── Affordability Calculator ── */}
        <CyberCard className="p-5 overflow-visible">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-4 h-4 text-[#22C55E]" />
            <CyberHeader size="xs">Khả năng mua nhà</CyberHeader>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CyberSubHeader className="mb-1.5 block">THU NHẬP/THÁNG</CyberSubHeader>
                <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#22C55E]/40 transition-all" />
              </div>
              <div>
                <CyberSubHeader className="mb-1.5 block">TIẾT KIÊM/THÁNG</CyberSubHeader>
                <input type="number" value={savings} onChange={(e) => setSavings(Number(e.target.value))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#22C55E]/40 transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <CyberSubHeader className="mb-1.5 block">KHU VỰC</CyberSubHeader>
                <select value={targetArea} onChange={(e) => setTargetArea(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono uppercase outline-none focus:border-[#22C55E]/40">
                  {AREA_PRICES.map((a) => <option key={a.area} value={a.area} className="bg-black">{a.area}</option>)}
                </select>
              </div>
              <div>
                <CyberSubHeader className="mb-1.5 block">DIỆN TÍCH (m²)</CyberSubHeader>
                <input type="number" value={apartmentSize} onChange={(e) => setApartmentSize(Number(e.target.value))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none" />
              </div>
            </div>
          </div>

          {/* Result Widget */}
          <div className="mt-8 bg-[#22C55E]/[0.02] border border-[#22C55E]/20 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#22C55E]/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[#22C55E]" />
                <CyberSubHeader color="text-[#22C55E]">LỘ TRÌNH TÍCH LŨY</CyberSubHeader>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <CyberSubHeader>TỔNG GIÁ TRỊ</CyberSubHeader>
                  <CyberTypography size="sm" variant="mono" className="text-white font-black">{fmt(targetPrice)}Đ</CyberTypography>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <CyberSubHeader>ĐẶT CỌC 30%</CyberSubHeader>
                  <CyberTypography size="sm" variant="mono" className="text-white font-black">{fmt(downPayment)}Đ</CyberTypography>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <CyberSubHeader>THỜI GIAN CHỜ</CyberSubHeader>
                <div className="text-right">
                  <CyberMetric size="lg" color="text-[#22C55E] drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                    {monthsToSave <= 0 ? "SẴN SÀNG" : `${yearsToSave} NĂM`}
                  </CyberMetric>
                  {monthsToSave > 0 && <CyberSubHeader className="block mt-1">QUỸ CÒN THIẾU {fmt(Math.max(0, downPayment - currentSaved))}Đ</CyberSubHeader>}
                </div>
              </div>
            </div>
          </div>
        </CyberCard>

        {/* ── Mua vs Thuê ── */}
        <CyberCard className="p-5">
          <div className="flex items-center gap-2 mb-6">
            <Scale className="w-4 h-4 text-[#E6B84F]" />
            <CyberHeader size="xs">So sánh Mua vs Thuê</CyberHeader>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <CyberSubHeader className="mb-1.5 block">TIỀN THUÊ/THÁNG</CyberSubHeader>
              <input type="number" value={rentMonthly} onChange={(e) => setRentMonthly(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none" />
            </div>
            <div>
              <CyberSubHeader className="mb-1.5 block">LÃI SUẤT VAY (%)</CyberSubHeader>
              <input type="number" step="0.1" value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none" />
            </div>
          </div>

          {/* Chart */}
          <div className="h-[140px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buyVsRent.chartData} layout="vertical" margin={{ left: -10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontWeight: 900, fontFamily: 'var(--font-heading)' }} axisLine={false} width={50} />
                <Tooltip contentStyle={{ backgroundColor: '#08110f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {buyVsRent.chartData.map((entry, index) => <Cell key={index} fill={entry.fill} fillOpacity={0.8} stroke={entry.fill} strokeWidth={1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 bg-white/[0.01] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between">
              <CyberSubHeader>GỐC + LÃI/THÁNG</CyberSubHeader>
              <CyberTypography size="xs" variant="mono" className="text-white">{fmt(buyVsRent.monthlyPayment)}Đ</CyberTypography>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2">
              <CyberSubHeader>TỔNG CHI MUA</CyberSubHeader>
              <CyberTypography size="xs" variant="mono" className="text-[#22C55E]">{(buyVsRent.totalBuyCost / 1e9).toFixed(1)} TỶ</CyberTypography>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2">
              <CyberSubHeader>TỔNG CHI THUÊ</CyberSubHeader>
              <CyberTypography size="xs" variant="mono" className="text-[#E6B84F]">{(buyVsRent.totalRentCost / 1e9).toFixed(1)} TỶ</CyberTypography>
            </div>
            <div className="mt-2 pt-3 border-t border-white/10">
              <p className="text-[10px] text-white/30 font-mono uppercase leading-relaxed">
                {buyVsRent.totalBuyCost < buyVsRent.totalRentCost
                  ? `💡 Mua nhà tối ưu hơn ${((buyVsRent.totalRentCost - buyVsRent.totalBuyCost) / 1e9).toFixed(1)} tỷ sau {loanYears} năm.`
                  : `💡 Thuê rẻ hơn ${((buyVsRent.totalBuyCost - buyVsRent.totalRentCost) / 1e9).toFixed(1)} tỷ nhưng không sở hữu tài sản.`}
              </p>
            </div>
          </div>
        </CyberCard>
      </div>

      {/* ═══ Nhà ở xã hội ═══ */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Building2 className="w-4 h-4 text-[#22C55E]" />
          <CyberHeader size="xs">Dòng Nhà ở xã hội (Social Housing)</CyberHeader>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {SOCIAL_HOUSING.map((h) => (
            <CyberCard key={h.project} className="p-4" showDecorators={false} variant="success">
              <CyberTypography size="sm" className="text-white font-black mb-3">{h.project}</CyberTypography>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-white/20" />
                  <CyberSubHeader>{h.location.toUpperCase()}</CyberSubHeader>
                </div>
                <div className="flex items-center gap-2">
                  <Banknote className="w-3 h-3 text-[#22C55E]" />
                  <CyberTypography size="xs" variant="mono" className="text-[#22C55E] font-black">{h.price.toUpperCase()}</CyberTypography>
                </div>
              </div>
              <div className="bg-[#22C55E]/10 rounded-lg p-2.5 border border-[#22C55E]/20">
                <span className="text-[9px] font-black text-[#22C55E] uppercase tracking-wider leading-relaxed">{h.loan}</span>
              </div>
            </CyberCard>
          ))}
        </div>
      </motion.div>

      {/* ═══ Vẹt Vàng Insight ═══ */}
      <CyberCard className="p-5" variant="success">
        <div className="flex items-start gap-4">
          <span className="text-3xl">🦜</span>
          <div className="flex-1">
            <CyberHeader size="xs" className="text-[#22C55E] mb-1">Vẹt Vàng Phân Tích</CyberHeader>
            <p className="text-xs text-white/60 leading-relaxed font-mono uppercase mb-4">
              &quot;Nhà ở xã hội với lãi suất 4.8% là chìa khóa vàng cho an cư. Đừng nhìn vào tổng giá tiền mà hoảng, hãy nhìn vào khả năng tích lũy hàng tháng. Chỉ cần kỷ luật, căn nhà đầu tiên không hề xa vời!&quot;
            </p>
            <Link href="/dashboard/budget" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-[#22C55E] hover:underline tracking-widest">
              Lên kế hoạch tích lũy <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </CyberCard>
    </motion.div>
  );
}
