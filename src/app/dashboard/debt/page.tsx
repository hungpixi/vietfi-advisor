"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { motion } from "framer-motion";
import {
  Plus,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  TrendingDown,
  Banknote,
  ShieldAlert,
  Trash2,
  Check,
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
import { FinancialTriageModal } from "@/components/debt/FinancialTriageModal";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

const defaultDebts: UIDebt[] = [
  { id: "1", name: "Thẻ tín dụng VIB", type: "credit_card", principal: 5000000, rate: 25, minPayment: 250000, icon: "credit_card", color: "#EF4444", hiddenFees: 99000 },
  { id: "2", name: "SPayLater", type: "bnpl", principal: 3200000, rate: 18, minPayment: 320000, icon: "bnpl", color: "#AB47BC", hiddenFees: 30000 },
  { id: "3", name: "Vay bạn", type: "personal", principal: 8000000, rate: 0, minPayment: 1000000, icon: "personal", color: "#00E5FF", hiddenFees: 0 },
  { id: "4", name: "Vay nhà trọ", type: "mortgage", principal: 2000000, rate: 0, minPayment: 2000000, icon: "mortgage", color: "#22C55E", hiddenFees: 0 },
  { id: "5", name: "Tín dụng đen", type: "loan_shark", principal: 1500000, rate: 60, minPayment: 200000, icon: "loan_shark", color: "#FF6B35", hiddenFees: 0 },
];

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function DebtPage() {
  const [debts, setDebts] = useState<UIDebt[]>(defaultDebts);
  const [monthlyIncome, setMonthlyIncome] = useState(12000000);
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("snowball");
  const [showAddModal, setShowAddModal] = useState(false);
  const [payingDebt, setPayingDebt] = useState<UIDebt | null>(null);
  const [hasPledged, setHasPledged] = useState(false);
  const [showTriage, setShowTriage] = useState(false);

  useEffect(() => {
    setDebts(getDebts() as unknown as UIDebt[]);
    import("@/lib/storage").then((mod) => {
      const income = mod.getIncome();
      setMonthlyIncome(income);
    });
  }, []);

  const saveDebts = useCallback((newDebts: UIDebt[]) => {
    setDebts(newDebts);
    saveDebtsLocal(newDebts as any);
    if (getCachedUserId()) {
      syncDebtsToSupabase(newDebts.map(d => ({
        name: d.name, type: d.type, principal: d.principal,
        rate: d.rate, min_payment: d.minPayment, icon: d.icon, color: d.color,
      }))).catch(() => { });
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
    addXP("pay_debt");
  };

  const exportDebtCSV = () => {
    const header = "Tên khoản nợ,Loại,Số tiền nợ (đ),Lãi suất (%/năm),Trả tối thiểu/tháng (đ)\n";
    const rows = debts.map(d => {
      const typeName = d.type === "credit_card" ? "Thẻ tín dụng" : d.type === "bnpl" ? "Trả sau" : d.type === "personal" ? "Vay người thân" : d.type === "mortgage" ? "Nhà/Phòng trọ" : d.type === "loan_shark" ? "Tín dụng đen" : "Khác";
      return `"${d.name}",${typeName},${d.principal},${d.rate},${d.minPayment}`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vietfi_no_${new Date().toISOString().slice(0, 10)}.csv`;
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
  const maxMonth = currentPlan.length > 0 ? Math.max(...currentPlan.map(p => p.month)) : 0;
  const chartData: any[] = [];
  const initialBalances = Object.fromEntries(debts.map(d => [d.name, d.principal]));

  for (let m = 0; m <= maxMonth; m++) {
    if (m === 0) {
      chartData.push({ month: "Now", ...initialBalances });
      continue;
    }
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

  const freedomMonthStr = getFreedomMonth(maxMonth);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {showAddModal && <AddDebtModal onClose={() => setShowAddModal(false)} onAdd={addDebt} />}
      {payingDebt && <PayDebtModal debt={payingDebt} onClose={() => setPayingDebt(null)} onPay={payDebt} />}
      {showTriage && <FinancialTriageModal debts={debts} dtiRatio={dtiRatio} onClose={() => setShowTriage(false)} />}

      {/* Triage Banner Alert */}
      {dtiRatio >= 40 && (
        <motion.div variants={fadeIn} className="mb-6 relative overflow-hidden bg-gradient-to-r from-[#EF4444]/20 to-[#FF6B35]/10 border border-[#EF4444] rounded-2xl p-4 shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#EF4444]/20 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-[#EF4444] rounded-full flex items-center justify-center animate-pulse shrink-0 shadow-[0_0_15px_#EF4444]">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <CyberHeader size="sm" className="mb-1">Cảnh báo: Tê Liệt Tài Chính</CyberHeader>
              <p className="text-xs text-white/70 leading-relaxed">DTI của bạn đã vượt ngưỡng an toàn ({dtiRatio.toFixed(1)}%). Bạn cần tái cấu trúc nợ khẩn cấp!</p>
            </div>
          </div>
          <button onClick={() => setShowTriage(true)} className="relative z-10 w-full md:w-auto shrink-0 px-5 py-3 bg-[#EF4444] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#FF6B35] transition-all flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" /> TRẠM CẤP CỨU
          </button>
        </motion.div>
      )}

      {/* Header */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <CyberHeader size="display" className="mb-0.5">Quỹ Nợ</CyberHeader>
            <CyberSubHeader>Phân tích dòng tiền &amp; lộ trình thoát nợ tối ưu</CyberSubHeader>
          </div>
          <div className="flex items-center gap-2">
            {debts.length > 0 && (
              <button onClick={exportDebtCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] text-white/50 text-xs font-black uppercase rounded-lg hover:bg-white/[0.08] transition-colors border border-white/[0.06]">
                <Download className="w-3.5 h-3.5" /> Xuất CSV
              </button>
            )}
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#22C55E] text-black text-xs font-black uppercase rounded-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all">
              <Plus className="w-3.5 h-3.5" /> Thêm nợ
            </button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <motion.div variants={fadeIn}>
          <CyberCard className="p-4" showDecorators={false}>
            <CyberSubHeader>Tổng nợ</CyberSubHeader>
            <CyberMetric size="md" color="text-[#EF4444]" className="mt-1">{formatVND(totalDebt)}</CyberMetric>
          </CyberCard>
        </motion.div>
        <motion.div variants={fadeIn}>
          <CyberCard className="p-4" showDecorators={false}>
            <CyberSubHeader>Tỷ lệ nợ/thu nhập</CyberSubHeader>
            <CyberMetric size="md" className="mt-1" style={{ color: dtiColor }}>{dtiRatio.toFixed(1)}%</CyberMetric>
            <div className="text-[10px] font-mono uppercase font-black" style={{ color: dtiColor }}>{dtiLabel}</div>
          </CyberCard>
        </motion.div>
        <motion.div variants={fadeIn}>
          <CyberCard className="p-4" showDecorators={false}>
            <CyberSubHeader>Trả/tháng (min)</CyberSubHeader>
            <CyberMetric size="md" color="text-[#E6B84F]" className="mt-1">{formatVND(totalMonthlyMin)}</CyberMetric>
          </CyberCard>
        </motion.div>
        <motion.div variants={fadeIn}>
          <CyberCard className="p-4 border-[#EF4444]/20" showDecorators={false} variant="danger">
            <CyberSubHeader>Lãi ẩn (12T)</CyberSubHeader>
            <CyberMetric size="md" color="text-[#EF4444]" className="mt-1">{formatVND(Math.round(totalHiddenInterest))}</CyberMetric>
            <CyberSubHeader>Nếu chỉ trả min</CyberSubHeader>
          </CyberCard>
        </motion.div>
      </motion.div>

      {/* Empty state */}
      {debts.length === 0 && (
        <CyberCard className="p-8 text-center mb-6">
          <div className="text-4xl mb-3">🎉</div>
          <CyberHeader size="md" className="mb-1">Không có khoản nợ nào!</CyberHeader>
          <p className="text-xs text-white/40 font-mono uppercase">Bạn đang sạch nợ — tuyệt vời!</p>
        </CyberCard>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Debt List */}
        <motion.div variants={stagger} className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <CyberHeader size="xs">Danh sách khoản nợ</CyberHeader>
            <CyberSubHeader>{debts.length} KHOẢN</CyberSubHeader>
          </div>
          {debts.map((debt) => {
            const Icon = ICON_MAP[debt.icon] || Banknote;
            const monthlyInterest = debt.principal * (debt.rate / 12 / 100);
            const isDangerous = debt.rate >= 20;
            return (
              <motion.div key={debt.id} variants={fadeIn}>
                <CyberCard
                  className={cn("p-4 transition-all", isDangerous ? "border-[#EF4444]/30" : "")}
                  variant={isDangerous ? "danger" : "success"}
                >
                  {isDangerous && (
                    <div className="flex items-center gap-1 mb-2">
                      <CyberSubHeader color="text-[#EF4444]" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> LÃI SUẤT NGUY HIỂM ({debt.rate}%/năm)
                      </CyberSubHeader>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/10">
                      <Icon className="w-5 h-5" style={{ color: debt.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <CyberTypography size="sm" className="text-white truncate">{debt.name}</CyberTypography>
                        <CyberTypography size="sm" className="text-white">{formatVND(debt.principal)}</CyberTypography>
                      </div>
                      <div className="flex items-center gap-3">
                        <CyberSubHeader>Lãi {debt.rate}%/năm</CyberSubHeader>
                        <CyberSubHeader>Min: {formatVND(debt.minPayment)}/tháng</CyberSubHeader>
                        {monthlyInterest > 0 && <span className="text-[10px] font-mono font-black uppercase text-[#EF4444]">+{formatVND(Math.round(monthlyInterest))} lãi</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.04]">
                    <button onClick={() => setPayingDebt(debt)} className="flex-1 py-1.5 text-[10px] font-black uppercase text-[#22C55E] bg-[#22C55E]/10 rounded-lg hover:bg-[#22C55E]/20 transition-all border border-[#22C55E]/20">Đã trả</button>
                    <button onClick={() => deleteDebt(debt.id)} className="px-3 py-1.5 text-[10px] font-black uppercase text-white/40 bg-white/5 rounded-lg hover:bg-white/10 transition-all border border-white/10">Xóa</button>
                  </div>
                </CyberCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Strategy Column */}
        {debts.length > 0 && (
          <motion.div variants={stagger} className="space-y-4">
            <CyberCard className="p-5">
              <CyberHeader size="xs" className="mb-4">Chiến thuật thoát nợ</CyberHeader>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setStrategy("snowball")} className={cn("flex-1 py-3 text-[10px] font-black uppercase rounded-lg border transition-all", strategy === "snowball" ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]" : "bg-white/5 text-white/40 border-white/10")}>Vết dầu loang</button>
                <button onClick={() => setStrategy("avalanche")} className={cn("flex-1 py-3 text-[10px] font-black uppercase rounded-lg border transition-all", strategy === "avalanche" ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]" : "bg-white/5 text-white/40 border-white/10")}>Tuyệt lở</button>
              </div>

              <div className="text-[10px] text-white/40 bg-white/5 rounded-lg p-3 font-mono uppercase mb-6 leading-relaxed">
                {strategy === "snowball" ? "💡 Ưu tiên khoản nhỏ nhất trước để tạo đà tâm lý." : "💡 Ưu tiên khoản lãi cao nhất trước để tiết kiệm tiền."}
              </div>

              <div className="space-y-0 relative pl-2">
                <CyberSubHeader className="mb-4 block">THỨ TỰ TIÊU DIỆT NỢ</CyberSubHeader>
                <div className="absolute left-[17px] top-[30px] bottom-[10px] w-0.5 bg-gradient-to-b from-[#22C55E]/50 to-transparent opacity-20" />

                {sortedDebts.map((debt, i) => {
                  const Icon = ICON_MAP[debt.icon] || Banknote;
                  const isFirst = i === 0;
                  return (
                    <div key={debt.id} className="relative z-10 flex items-start gap-3 py-2 group">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all", isFirst ? "bg-[#22C55E]/20 border-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-black border-white/20")}>
                        <span className={cn("text-[10px] font-black", isFirst ? "text-[#22C55E]" : "text-white/40")}>{i + 1}</span>
                      </div>
                      <div className={cn("flex-1 transition-opacity", isFirst ? "opacity-100" : "opacity-40 hover:opacity-100")}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-3 h-3" style={{ color: debt.color }} />
                          <CyberTypography size="xs" className="text-white">{debt.name}</CyberTypography>
                          {isFirst && <span className="px-1.5 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-[8px] rounded uppercase font-black animate-pulse">TIÊU DIỆT</span>}
                        </div>
                        <CyberSubHeader className="block">{formatVND(debt.principal)} @ {debt.rate}%</CyberSubHeader>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CyberCard>

            <CyberCard className="p-5" showDecorators={false}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-[#22C55E]" />
                  <CyberSubHeader>Ngày Độc Lập<br />Tài Chính</CyberSubHeader>
                </div>
                <div className="text-right">
                  <CyberMetric size="lg" color="text-[#22C55E]">{freedomMonthStr}</CyberMetric>
                  <CyberSubHeader className="block">CÒN {maxMonth} THÁNG</CyberSubHeader>
                </div>
              </div>
            </CyberCard>

            {chartData.length > 0 && (
              <CyberCard className="p-4" showDecorators={false}>
                <CyberSubHeader className="mb-4 block">BIỂU ĐỒ DOMINO</CyberSubHeader>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                      <XAxis dataKey="month" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#08110f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      {sortedDebts.map((debt, index) => (
                        <Area key={debt.id} type="monotone" dataKey={debt.name} stackId="1" stroke={debt.color} fill={debt.color} fillOpacity={0.6 - (index * 0.1)} strokeWidth={1} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CyberCard>
            )}

            <ExtraPaymentSlider
              totalDebt={totalDebt}
              totalMonthlyMin={totalMonthlyMin}
              debts={debts}
            />

            <CyberCard className="p-5" showDecorators={false}>
              <div className="flex items-center justify-between mb-2">
                <CyberSubHeader>TỶ LỆ NỢ / THU NHẬP</CyberSubHeader>
                <CyberMetric size="xs" style={{ color: dtiColor }}>{dtiRatio.toFixed(1)}%</CyberMetric>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(dtiRatio, 100)}%`, backgroundColor: dtiColor }} />
              </div>
            </CyberCard>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
