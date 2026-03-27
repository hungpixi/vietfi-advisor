"use client";

import { motion } from "framer-motion";
import {
  CreditCard,
  Plus,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  TrendingDown,
  Banknote,
  Home,
  UserX,
  ShieldAlert,
  Smartphone,
  Trash2,
  Check,
  X,
  Download,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { addXP } from "@/lib/gamification";
import { getCachedUserId, saveDebts as syncDebtsToSupabase } from "@/lib/supabase/user-data";
import { analyzeDTI, snowballPlan, avalanchePlan, getFreedomMonth } from "@/lib/calculations/debt-optimizer";
import { getDebts, setDebts as saveDebtsLocal } from "@/lib/storage";

import { UIDebt, ICON_MAP, formatVND } from "@/components/debt/types";
import { AddDebtModal } from "@/components/debt/AddDebtModal";
import { PayDebtModal } from "@/components/debt/PayDebtModal";
import { ExtraPaymentSlider } from "@/components/debt/ExtraPaymentSlider";
import { DTIDominoGauge } from "@/components/debt/DTIDominoGauge";
import { FinancialTriageModal } from "@/components/debt/FinancialTriageModal";

const defaultDebts: UIDebt[] = [
  { id: "1", name: "Thẻ tín dụng VIB", type: "credit_card", principal: 5000000, rate: 25, minPayment: 250000, icon: "credit_card", color: "#EF4444", hiddenFees: 99000 },
  { id: "2", name: "SPayLater", type: "bnpl", principal: 3200000, rate: 18, minPayment: 320000, icon: "bnpl", color: "#AB47BC", hiddenFees: 30000 },
  { id: "3", name: "Vay bạn", type: "personal", principal: 8000000, rate: 0, minPayment: 1000000, icon: "personal", color: "#00E5FF", hiddenFees: 0 },
  { id: "4", name: "Vay nhà trọ", type: "mortgage", principal: 2000000, rate: 0, minPayment: 2000000, icon: "mortgage", color: "#22C55E", hiddenFees: 0 },
  { id: "5", name: "Tín dụng đen", type: "loan_shark", principal: 1500000, rate: 60, minPayment: 200000, icon: "loan_shark", color: "#FF6B35", hiddenFees: 0 },
];

const monthlyIncome = 12000000;

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

/* ═══════════════════ PAGE ═══════════════════ */


export default function DebtPage() {
  const [debts, setDebts] = useState<UIDebt[]>(defaultDebts);
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("snowball");
  const [showAddModal, setShowAddModal] = useState(false);
  const [payingDebt, setPayingDebt] = useState<UIDebt | null>(null);
  const [hasPledged, setHasPledged] = useState(false);
  const [showTriage, setShowTriage] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setDebts(getDebts() as unknown as UIDebt[]);
  }, []);

  // Save to localStorage + Supabase sync
  const saveDebts = useCallback((newDebts: UIDebt[]) => {
    setDebts(newDebts);
    // Background Supabase sync
    if (getCachedUserId()) {
      syncDebtsToSupabase(newDebts.map(d => ({
        name: d.name, type: d.type, principal: d.principal,
        rate: d.rate, min_payment: d.minPayment, icon: d.icon, color: d.color,
      }))).catch(() => {});
    }
  }, []);

  const addDebt = (d: Omit<UIDebt, "id">) => {
    saveDebts([...debts, { ...d, id: Date.now().toString() }]);
  };

  const deleteDebt = (id: string) => {
    saveDebts(debts.filter((d) => d.id !== id));
  };

  const payDebt = (id: string, amount: number) => {
    saveDebts(debts.map((d) => d.id === id ? { ...d, principal: Math.max(0, d.principal - amount) } : d).filter((d) => d.principal > 0));
    addXP("pay_debt"); // +50 XP
  };

  const exportDebtCSV = () => {
    const header = "Tên khoản nợ,Loại,Số tiền nợ (đ),Lãi suất (%/năm),Trả tối thiểu/tháng (đ)\n";
    const rows = debts.map(d => {
      const typeName = d.type === "credit_card" ? "Thẻ tín dụng" : d.type === "bnpl" ? "Trả sau" : d.type === "personal" ? "Vay người thân" : d.type === "mortgage" ? "Nhà/Phòng trọ" : d.type === "loan_shark" ? "Tín dụng đen" : "Khác";
      return `"${d.name}",${typeName},${d.principal},${d.rate},${d.minPayment}`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vietfi_no_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const analysis = analyzeDTI(debts, monthlyIncome);
  const { totalDebt, dtiRatio, dtiLevel, dtiColor, totalMonthlyMin, totalHiddenInterest } = analysis;
  const dtiLabel = dtiLevel === "safe" ? "An toàn" : dtiLevel === "warning" ? "Cảnh giác" : "Nguy hiểm";

  const sortedDebts = strategy === "snowball"
    ? [...debts].sort((a, b) => a.principal - b.principal)
    : [...debts].sort((a, b) => {
        const rateB = analysis.realInterestRates.find(r => r.id === b.id)?.realRate || b.rate;
        const rateA = analysis.realInterestRates.find(r => r.id === a.id)?.realRate || a.rate;
        return rateB - rateA;
      });

  const currentPlan = strategy === "snowball" ? snowballPlan(debts) : avalanchePlan(debts);

  // ─── XỬ LÝ DỮ LIỆU STACKED CHART (DOMINO EFFECT) ───
  const maxMonth = currentPlan.length > 0 ? Math.max(...currentPlan.map(p => p.month)) : 0;
  const chartData: any[] = [];
  const initialBalances = Object.fromEntries(debts.map(d => [d.name, d.principal]));

  for (let m = 0; m <= maxMonth; m++) {
    if (m === 0) {
      chartData.push({ month: "Now", ...initialBalances });
      continue;
    }
    
    // Lấy sample 8 điểm trên biểu đồ cho đẹp
    if (m % Math.max(1, Math.floor(maxMonth / 8)) === 0 || m === maxMonth) {
      const stepsInMonth = currentPlan.filter(p => p.month === m);
      const row: any = { month: `T${m}` };
      debts.forEach(d => {
        const step = stepsInMonth.find(p => p.debtName === d.name);
        row[d.name] = step ? step.remaining : 0;
      });
      chartData.push(row);
    }
  }

  // ─── TÍNH TOÁN NGÀY ĐỘC LẬP (FREEDOM DAY) ───
  const freedomMonthStr = getFreedomMonth(maxMonth);

  // ─── SMART REFINANCE ADVISOR (TÌM NỢ ĐỘC HẠI) ───
  const toxicDebt = debts.find(d => d.rate >= 40);
  const canRefinance = toxicDebt && dtiRatio < 50; // Còn dư địa DTI để vay NH

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {showAddModal && <AddDebtModal onClose={() => setShowAddModal(false)} onAdd={addDebt} />}
      {payingDebt && <PayDebtModal debt={payingDebt} onClose={() => setPayingDebt(null)} onPay={payDebt} />}
      {showTriage && <FinancialTriageModal debts={debts} dtiRatio={dtiRatio} onClose={() => setShowTriage(false)} />}

      {/* Triage Banner Alert (Hiển thị khi DTI nguy hiểm) */}
      {dtiRatio >= 40 && (
        <motion.div variants={fadeIn} className="mb-6 relative overflow-hidden bg-gradient-to-r from-[#EF4444]/20 to-[#FF6B35]/10 border border-[#EF4444] rounded-2xl p-4 shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#EF4444]/20 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-[#EF4444] rounded-full flex items-center justify-center animate-pulse shrink-0 shadow-[0_0_15px_#EF4444]">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-white uppercase tracking-wider mb-1">Cảnh báo: Tê Liệt Tài Chính</h2>
              <p className="text-xs text-white/70 leading-relaxed">DTI của bạn đã vượt ngưỡng an toàn ({dtiRatio.toFixed(1)}%). Bạn cần tái cấu trúc nợ khẩn cấp trước khi quá muộn!</p>
            </div>
          </div>
          <button onClick={() => setShowTriage(true)} className="relative z-10 w-full md:w-auto shrink-0 px-5 py-3 bg-[#EF4444] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#FF6B35] transition-all flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Vào Trạm Cấp Cứu
          </button>
        </motion.div>
      )}

      {/* Header */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">Quỹ Nợ</h1>
            <p className="text-[13px] text-white/40">Hợp nhất tất cả khoản nợ — tìm lộ trình thoát nợ</p>
          </div>
          <div className="flex items-center gap-2">
            {debts.length > 0 && (
              <button onClick={exportDebtCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] text-white/50 text-xs font-medium rounded-lg hover:bg-white/[0.08] transition-colors border border-white/[0.06]">
                <Download className="w-3.5 h-3.5" /> Xuất CSV
              </button>
            )}
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-primary text-black text-xs font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(230,184,79,0.2)] transition-all">
              <Plus className="w-3.5 h-3.5" />
              Thêm nợ
            </button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <motion.div variants={fadeIn} className="glass-card p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">Tổng nợ</span>
          <div className="text-xl font-bold text-[#EF4444] mt-1">{formatVND(totalDebt)}</div>
        </motion.div>
        <motion.div variants={fadeIn} className="glass-card p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">Tỷ lệ nợ/thu nhập</span>
          <div className="text-xl font-bold mt-1" style={{ color: dtiColor }}>{dtiRatio.toFixed(1)}%</div>
          <span className="text-[10px]" style={{ color: dtiColor }}>{dtiLabel}</span>
        </motion.div>
        <motion.div variants={fadeIn} className="glass-card p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">Trả/tháng (min)</span>
          <div className="text-xl font-bold text-[#E6B84F] mt-1">{formatVND(totalMonthlyMin)}</div>
        </motion.div>
        <motion.div variants={fadeIn} className="glass-card p-4 border-[#EF4444]/10">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">Lãi ẩn (12T)</span>
          <div className="text-xl font-bold text-[#EF4444] mt-1">{formatVND(Math.round(totalHiddenInterest))}</div>
          <span className="text-[10px] text-white/25">Nếu chỉ trả min</span>
        </motion.div>
      </motion.div>

      {/* Empty state */}
      {debts.length === 0 && (
        <motion.div variants={fadeIn} className="glass-card p-8 text-center mb-6">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-white mb-1">Không có khoản nợ nào!</h3>
          <p className="text-xs text-white/40">Bạn đang sạch nợ — tuyệt vời! Hãy bắt đầu đầu tư để gia tăng tài sản.</p>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Debt List */}
        <motion.div variants={stagger} className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Danh sách khoản nợ</h3>
            <span className="text-[10px] text-white/20 font-mono">{debts.length} khoản</span>
          </div>
          {debts.map((debt) => {
            const Icon = ICON_MAP[debt.icon] || Banknote;
            const monthlyInterest = debt.principal * (debt.rate / 12 / 100);
            const isDangerous = debt.rate >= 20;
            return (
              <motion.div key={debt.id} variants={fadeIn}
                className={`glass-card p-4 transition-all ${isDangerous ? "border-[#EF4444]/30 bg-[#EF4444]/[0.02]" : ""}`}
              >
                {/* Danger badge */}
                {isDangerous && (
                  <div className="flex items-center gap-1 mb-2 text-[10px] text-[#EF4444] font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    ⚠️ LÃI SUẤT NGUY HIỂM ({debt.rate}%/năm) — Ưu tiên trả ngay!
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${debt.color}12` }}>
                    <Icon className="w-5 h-5" style={{ color: debt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white truncate">{debt.name}</h4>
                      <span className="text-sm font-bold text-white">{formatVND(debt.principal)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-white/25">Lãi {debt.rate}%/năm</span>
                      <span className="text-[10px] text-white/25">Min: {formatVND(debt.minPayment)}/tháng</span>
                      {monthlyInterest > 0 && (
                        <span className="text-[10px] text-[#EF4444]">+{formatVND(Math.round(monthlyInterest))} lãi/tháng</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                  <button onClick={() => setPayingDebt(debt)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-[#22C55E] bg-[#22C55E]/10 rounded-lg hover:bg-[#22C55E]/20 transition-colors border border-[#22C55E]/10">
                    <Check className="w-3 h-3" /> Đã trả
                  </button>
                  <button onClick={() => deleteDebt(debt.id)} className="flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-medium text-[#EF4444]/60 bg-[#EF4444]/5 rounded-lg hover:bg-[#EF4444]/10 transition-colors border border-[#EF4444]/5">
                    <Trash2 className="w-3 h-3" /> Xóa
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Strategy Toggle */}
        {debts.length > 0 && (
          <motion.div variants={fadeIn} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Lộ trình thoát nợ</h3>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setStrategy("snowball")}
                className={`flex-1 py-4 flex flex-col items-center justify-center text-xs font-medium rounded-lg transition-all ${strategy === "snowball" ? "bg-[#E6B84F]/15 text-[#E6B84F] border border-[#E6B84F]/20" : "bg-white/[0.03] text-white/40 border border-white/[0.06]"}`}
              >
                <div className="flex items-center"><ArrowDown className="w-4 h-4 mr-1" /> Vết dầu loang</div>
                <span className="text-[9px] opacity-70 mt-1 font-normal tracking-wide">TRẢ NHỎ TRƯỚC</span>
              </button>
              <button
                onClick={() => setStrategy("avalanche")}
                className={`flex-1 py-4 flex flex-col items-center justify-center text-xs font-medium rounded-lg transition-all ${strategy === "avalanche" ? "bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/20" : "bg-white/[0.03] text-white/40 border border-white/[0.06]"}`}
              >
                <div className="flex items-center"><ArrowUp className="w-4 h-4 mr-1" /> Tuyệt lở</div>
                <span className="text-[9px] opacity-70 mt-1 font-normal tracking-wide">TRẢ LÃI CAO TRƯỚC</span>
              </button>
            </div>

            <div className="text-[11px] text-white/30 mb-4 bg-white/[0.02] rounded-lg p-2.5">
              {strategy === "snowball"
                ? "💡 Trả khoản nhỏ nhất trước → tâm lý chiến thắng"
                : "💡 Trả khoản lãi cao nhất trước → tối ưu tài chính"}
            </div>

            {/* ─── BẢN ĐỒ THOÁT NỢ (GAMIFIED ROADMAP) ─── */}
            <div className="space-y-0 relative mt-5 mb-2 pl-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/20 block mb-4">THỨ TỰ TIÊU DIỆT NỢ</span>
              
              {/* Timeline Line */}
              <div className="absolute left-[17px] top-[30px] bottom-[10px] w-0.5 bg-gradient-to-b from-[#22C55E]/50 via-white/10 to-transparent z-0" />

              {sortedDebts.map((debt, i) => {
                const Icon = ICON_MAP[debt.icon] || Banknote;
                const isFirst = i === 0;
                return (
                  <div key={debt.id} className="relative z-10 flex items-start gap-3 p-3 mt-1 group">
                    {/* Node / Checkpoint */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all ${isFirst ? "bg-[#22C55E]/20 border-[#22C55E] ring-4 ring-[#22C55E]/10 scale-110" : "bg-[#111] border-white/20 group-hover:border-white/40"}`}>
                       <span className={`text-[10px] font-bold ${isFirst ? "text-[#22C55E]" : "text-white/40"}`}>{i + 1}</span>
                    </div>

                    <div className={`flex-1 flex flex-col pt-0.5 ${isFirst ? "opacity-100" : "opacity-60"}`}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-3 h-3" style={{ color: debt.color }} />
                        <span className={`text-xs font-semibold ${isFirst ? "text-white" : "text-white/60"}`}>{debt.name}</span>
                        {isFirst && <span className="px-1.5 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-[8px] rounded uppercase font-bold tracking-wider ml-auto animate-pulse flex items-center gap-1"><ArrowDown className="w-2 h-2"/> Dồn Lực</span>}
                      </div>
                      <div className="flex gap-3 text-[10px] mt-1">
                         <span className="text-white/40">Gốc: <strong className="text-white/80">{formatVND(debt.principal)}</strong></span>
                         <span className="text-white/40">Lãi: <strong className={isFirst ? "text-[#EF4444]" : "text-white/50"}>{debt.rate}%</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-5 border-t border-white/[0.04]">
              {/* ─── THE PLEDGE (BẢN KÝ CAM KẾT) ─── */}
              {!hasPledged && totalDebt > 0 && (
                 <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => {
                     setHasPledged(true);
                     addXP("pledge_debt_free");
                     // Bắn pháo hoa UI (Sẽ thêm lib canvas-confetti nếu có tgian)
                   }}
                   className="w-full mb-6 p-1 rounded-xl bg-gradient-to-r from-[#E6B84F] via-[#FF6B35] to-[#AB47BC] shadow-[0_0_20px_rgba(230,184,79,0.3)] animate-pulse"
                 >
                   <div className="bg-[#111] w-full h-full rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">✍️</span>
                        <div className="text-left">
                           <h4 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#E6B84F] to-[#FF6B35] uppercase tracking-wider">Lời thề sắt đá</h4>
                           <p className="text-[10px] text-white/50">Cam kết giảm tiêu xài, khô máu trả nợ (+200 XP)</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white bg-white/10 px-3 py-1.5 rounded-md">Ký Ngay</span>
                   </div>
                 </motion.button>
              )}

              {/* ─── WIDGET: NGÀY ĐỘC LẬP TÀI CHÍNH (FREEDOM DAY) ─── */}
              <div className="relative overflow-hidden rounded-xl border border-[#22C55E]/30 bg-gradient-to-br from-[#22C55E]/10 to-transparent p-5 mb-5 group">
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#22C55E]/10 rounded-full blur-3xl group-hover:bg-[#22C55E]/20 transition-all"></div>
                
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center border border-[#22C55E]/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                       <TrendingDown className="w-4 h-4 text-[#22C55E]" />
                    </div>
                    <span className="text-xs font-bold text-white/80 uppercase tracking-widest leading-tight">Ngày Độc Lập<br/><span className="text-[9px] text-white/40 font-normal">Tài Chính</span></span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#22C55E] drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">{freedomMonthStr}</p>
                    <span className="text-[10px] text-white/50 bg-[#22C55E]/10 px-2 py-0.5 rounded-full border border-[#22C55E]/20">Còn {maxMonth} tháng</span>
                  </div>
                </div>
              </div>
              
              {/* Domino Effect Chart (Thác Đổ) */}
              {chartData.length > 0 && (
                <div className="w-full mt-2 relative" style={{ height: "200px" }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                      <XAxis dataKey="month" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={10} tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', color: 'white', opacity: 0.95 }}
                        itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                        labelStyle={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}
                        formatter={(value: any) => formatVND(value as number)}
                      />
                      {/* Vòng lặp đè các khoản nợ thành khối Stacked (Thác Đổ) */}
                      {sortedDebts.map((debt, index) => (
                        <Area 
                          key={debt.id} 
                          type="monotone" 
                          dataKey={debt.name} 
                          stackId="1" 
                          stroke={debt.color} 
                          fill={debt.color} 
                          fillOpacity={0.8 - (index * 0.1)} 
                          strokeWidth={1} 
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ═══ Extra payment slider ═══ */}
            {debts.length > 0 && (
              <ExtraPaymentSlider
                totalDebt={totalDebt}
                totalMonthlyMin={totalMonthlyMin}
                debts={debts}
              />
            )}

            {/* DTI Gauge mini */}
            <div className="mt-4 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/20">TỶ LỆ NỢ/THU NHẬP</span>
                <span className="text-xs font-bold" style={{ color: dtiColor }}>{dtiRatio.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(dtiRatio, 100)}%`, backgroundColor: dtiColor }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-[#22C55E]">0%</span>
                <span className="text-[9px] text-[#E6B84F]">20%</span>
                <span className="text-[9px] text-[#EF4444]">40%+</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
