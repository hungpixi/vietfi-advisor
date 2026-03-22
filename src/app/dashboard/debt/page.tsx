"use client";

import { motion } from "framer-motion";
import {
  CreditCard,
  Plus,
  AlertTriangle,
  ArrowDown,
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
import { Debt, analyzeDTI, snowballPlan, avalanchePlan, PayoffStep } from "@/lib/calculations/debt-optimizer";

/* ─── Types ─── */
// Extends the core Debt interface with UI-specific fields
interface UIDebt extends Debt {
  icon: string;
  color: string;
}
// Local definitions removed in favor of UIDebt

const ICON_MAP: Record<string, typeof CreditCard> = {
  credit_card: CreditCard,
  bnpl: Smartphone,
  personal: UserX,
  mortgage: Home,
  loan_shark: ShieldAlert,
  other: Banknote,
};

const COLOR_OPTIONS = ["#EF4444", "#AB47BC", "#00E5FF", "#22C55E", "#FF6B35", "#E6B84F"];

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

function formatVND(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}tr`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

/* ═══════════════════ ADD DEBT MODAL ═══════════════════ */
function AddDebtModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: Omit<UIDebt, "id">) => void }) {
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState(0);
  const [rate, setRate] = useState(0);
  const [minPayment, setMinPayment] = useState(0);
  const [hiddenFees, setHiddenFees] = useState(0);
  const [type, setType] = useState<UIDebt["type"]>("other" as any);
  const [color, setColor] = useState("#E6B84F");

  const handleSubmit = () => {
    if (!name || principal <= 0) return;
    onAdd({ name, principal, rate, minPayment: minPayment || Math.round(principal * 0.05), type, hiddenFees, icon: type, color });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Thêm khoản nợ</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-white/25 uppercase font-mono tracking-wider block mb-1">Tên khoản nợ</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[#E6B84F]/30" placeholder="VD: Thẻ tín dụng..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/25 uppercase font-mono tracking-wider block mb-1">Số tiền nợ (₫)</label>
              <input type="number" value={principal || ""} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[#E6B84F]/30" placeholder="5000000" />
            </div>
            <div>
              <label className="text-[10px] text-white/25 uppercase font-mono tracking-wider block mb-1">Lãi suất (%/năm)</label>
              <input type="number" value={rate || ""} onChange={(e) => setRate(Number(e.target.value))} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[#E6B84F]/30" placeholder="18" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-white/25 uppercase font-mono tracking-wider block mb-1">Trả tối thiểu/tháng (₫)</label>
            <input type="number" value={minPayment || ""} onChange={(e) => setMinPayment(Number(e.target.value))} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[#E6B84F]/30" placeholder="250000" />
          </div>
          <div>
            <label className="text-[10px] text-white/25 uppercase font-mono tracking-wider block mb-1">Loại nợ</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ICON_MAP).map(([key]) => (
                <button key={key} onClick={() => setType(key as any)}
                  className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-all ${type === key ? "bg-[#E6B84F]/15 text-[#E6B84F] border-[#E6B84F]/20" : "bg-white/[0.03] text-white/40 border-white/[0.06]"}`}
                >
                  {key === "credit_card" ? "Thẻ tín dụng" : key === "bnpl" ? "Trả sau" : key === "personal" ? "Vay người thân" : key === "mortgage" ? "Nhà/Phòng trọ" : key === "loan_shark" ? "Tín dụng đen" : "Khác"}
                </button>
              ))}
            </div>
          </div>
          {(type === "bnpl" || type === "credit_card") && (
             <div>
                <label className="text-[10px] text-white/25 uppercase font-mono tracking-wider block mb-1">
                  Phí ẩn / phí duy trì hàng tháng (₫) <span className="text-[#EF4444]">*</span>
                </label>
                <input type="number" value={hiddenFees || ""} onChange={(e) => setHiddenFees(Number(e.target.value))} className="w-full px-3 py-2 bg-white/[0.04] border border-[#EF4444]/30 rounded-lg text-sm text-white focus:outline-none focus:border-[#EF4444]" placeholder="Ví dụ: 30000 (phí SPayLater)" />
                <p className="text-[9px] text-[#EF4444]/60 mt-1">Các khoản BNPL/Thẻ tín dụng thường có phí ẩn (bảo hiểm, phí quản lý...). Điền vào để thấy Lãi suất thực tế!</p>
             </div>
          )}
          <div>
            <label className="text-[10px] text-white/25 uppercase font-mono tracking-wider block mb-1">Màu sắc</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full transition-all ${color === c ? "ring-2 ring-white/30 scale-110" : ""}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} className="w-full mt-4 py-2.5 bg-gradient-primary text-black text-xs font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(230,184,79,0.2)] transition-all">
          Thêm khoản nợ
        </button>
      </motion.div>
    </div>
  );
}

/* ═══════════════════ PAY DEBT MODAL ═══════════════════ */
function PayDebtModal({ debt, onClose, onPay }: { debt: UIDebt; onClose: () => void; onPay: (id: string, amount: number) => void }) {
  const [amount, setAmount] = useState(debt.minPayment);
  const quickAmounts = [debt.minPayment, Math.round(debt.principal * 0.1), Math.round(debt.principal * 0.25), debt.principal];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Ghi nhận đã trả — {debt.name}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-3">
          <label className="text-[10px] text-white/25 uppercase font-mono tracking-wider block mb-1">Số tiền đã trả (₫)</label>
          <input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-[#E6B84F]/30" />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {quickAmounts.filter((v, i, a) => a.indexOf(v) === i && v > 0).map((v) => (
            <button key={v} onClick={() => setAmount(v)} className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-all ${amount === v ? "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/20" : "bg-white/[0.03] text-white/40 border-white/[0.06]"}`}>
              {formatVND(v)}
            </button>
          ))}
        </div>
        <button onClick={() => { onPay(debt.id, Math.min(amount, debt.principal)); onClose(); }} className="w-full py-2.5 bg-[#22C55E] text-black text-xs font-semibold rounded-lg hover:bg-[#22C55E]/90 transition-all flex items-center justify-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> Ghi nhận đã trả {formatVND(amount)}
        </button>
      </motion.div>
    </div>
  );
}

/* ═══════════════════ EXTRA PAYMENT SLIDER ═══════════════════ */
function ExtraPaymentSlider({ totalDebt, totalMonthlyMin, debts }: { totalDebt: number; totalMonthlyMin: number; debts: UIDebt[] }) {
  const [extra, setExtra] = useState(0);
  const maxExtra = Math.min(3000000, totalDebt); // max 3tr/tháng

  const baseMonths = Math.max(1, Math.ceil(totalDebt / totalMonthlyMin));
  const newMonths = totalMonthlyMin + extra > 0 ? Math.max(1, Math.ceil(totalDebt / (totalMonthlyMin + extra))) : baseMonths;
  const savedMonths = baseMonths - newMonths;

  // Tính lãi tiết kiệm được
  const baseInterest = debts.reduce((s, d) => s + d.principal * (d.rate / 12 / 100) * baseMonths, 0);
  const newInterest = debts.reduce((s, d) => s + d.principal * (d.rate / 12 / 100) * newMonths, 0);
  const savedInterest = Math.max(0, baseInterest - newInterest);

  return (
    <div className="mt-4 pt-3 border-t border-white/[0.04]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/20">NẾU TRẢ THÊM</span>
        <span className="text-xs font-bold text-[#E6B84F]">+{formatVND(extra)}/tháng</span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={maxExtra}
        step={50000}
        value={extra}
        onChange={(e) => setExtra(Number(e.target.value))}
        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#E6B84F]"
        style={{
          background: `linear-gradient(to right, #E6B84F ${(extra / maxExtra) * 100}%, rgba(255,255,255,0.05) ${(extra / maxExtra) * 100}%)`,
        }}
      />

      <div className="flex justify-between text-[9px] text-white/15 mt-1 mb-3">
        <span>0</span>
        <span>{formatVND(maxExtra)}</span>
      </div>

      {extra > 0 && (
        <div className="space-y-2 bg-white/[0.02] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/40">Thoát nợ mới</span>
            <span className="text-xs font-bold text-[#22C55E]">~{newMonths} tháng</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/40">Nhanh hơn</span>
            <span className="text-xs font-bold text-[#E6B84F]">{savedMonths} tháng</span>
          </div>
          {savedInterest > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">Tiết kiệm lãi</span>
              <span className="text-xs font-bold text-[#22C55E]">{formatVND(Math.round(savedInterest))}</span>
            </div>
          )}
          <p className="text-[10px] text-white/20 mt-1 pt-2 border-t border-white/[0.04]">
            💡 Trả thêm {formatVND(extra)}/tháng → thoát nợ nhanh hơn {savedMonths} tháng{savedInterest > 0 ? `, tiết kiệm ${formatVND(Math.round(savedInterest))} tiền lãi` : ""}!
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ PAGE ═══════════════════ */
export default function DebtPage() {
  const [debts, setDebts] = useState<UIDebt[]>(defaultDebts);
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("snowball");
  const [showAddModal, setShowAddModal] = useState(false);
  const [payingDebt, setPayingDebt] = useState<UIDebt | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vietfi_debts");
    if (saved) {
      try { setDebts(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Save to localStorage + Supabase sync
  const saveDebts = useCallback((newDebts: UIDebt[]) => {
    setDebts(newDebts);
    localStorage.setItem("vietfi_debts", JSON.stringify(newDebts));
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

  // Domino Effect Chart Data
  const chartData = currentPlan.map(p => ({
    month: `T${p.month}`,
    remaining: p.remaining
  })).filter((_, i) => i % Math.max(1, Math.floor(currentPlan.length / 10)) === 0 || i === currentPlan.length - 1);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {showAddModal && <AddDebtModal onClose={() => setShowAddModal(false)} onAdd={addDebt} />}
      {payingDebt && <PayDebtModal debt={payingDebt} onClose={() => setPayingDebt(null)} onPay={payDebt} />}

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
          <div className="text-xl font-bold mt-1" style={{ color: dtiColor }}>{dtiRatio}%</div>
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

      {/* DTI Alert */}
      {dtiRatio >= 40 && (
        <motion.div variants={fadeIn} className="glass-card p-4 border-[#EF4444]/20 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#EF4444]">Tỷ lệ nợ/thu nhập vượt ngưỡng!</h3>
              <p className="text-xs text-white/40 mt-1">
                Tỷ lệ nợ {dtiRatio}% (ngưỡng an toàn &lt;20%). Bạn đang dùng {dtiRatio}% thu nhập hàng tháng để trả nợ.
                Nên ưu tiên giảm nợ trước khi đầu tư.
              </p>
            </div>
          </div>
        </motion.div>
      )}

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

            {/* Priority Order */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/20">THỨ TỰ ƯU TIÊN</span>
              {sortedDebts.map((debt, i) => {
                const Icon = ICON_MAP[debt.icon] || Banknote;
                return (
                  <div key={debt.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02]">
                    <span className="text-xs font-bold text-white/20 w-4">#{i + 1}</span>
                    <Icon className="w-3.5 h-3.5" style={{ color: debt.color }} />
                    <span className="text-xs text-white/60 flex-1 truncate">{debt.name}</span>
                    <span className="text-xs font-medium text-white/40">
                      {strategy === "snowball" ? formatVND(debt.principal) : `${debt.rate}%`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-[#22C55E]" />
                <div>
                  <span className="text-xs text-white/60">Dự kiến thoát nợ — Tối ưu nhất</span>
                  <p className="text-sm font-bold text-[#22C55E]">~{currentPlan.length > 0 ? currentPlan[currentPlan.length - 1].month : 0} tháng</p>
                </div>
              </div>
              
              {/* Domino Effect Chart */}
              {chartData.length > 0 && (
                <div className="h-[120px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={strategy === "snowball" ? "#E6B84F" : "#00E5FF"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={strategy === "snowball" ? "#E6B84F" : "#00E5FF"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="month" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={10} tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} tickLine={false} axisLine={false} />
                      <Tooltip 
                        formatter={(value: any) => [formatVND(value as number), "Dư nợ"]}
                        labelStyle={{ color: 'black' }}
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: 'white' }}
                      />
                      <Area type="monotone" dataKey="remaining" stroke={strategy === "snowball" ? "#E6B84F" : "#00E5FF"} fillOpacity={1} fill="url(#colorRemaining)" strokeWidth={2} />
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
                <span className="text-xs font-bold" style={{ color: dtiColor }}>{dtiRatio}%</span>
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
