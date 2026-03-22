"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Coffee, ShoppingBag, Car, Home, Gamepad2, Heart,
  GraduationCap, TrendingUp, Trash2, X, Check, Edit3, Pencil, AlertTriangle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { addXP } from "@/lib/gamification";
import { getCachedUserId, saveBudgetPots, addExpense } from "@/lib/supabase/user-data";

/* ─── Types ─── */
interface Expense {
  id: string;
  potId: string;
  amount: number;
  note: string;
  date: string;
}

interface Pot {
  id: string;
  name: string;
  iconKey: string;
  allocated: number;
  color: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
  Coffee, ShoppingBag, Car, Home, Gamepad2, Heart, GraduationCap, TrendingUp, Wallet, Pencil,
};

const ICON_OPTIONS = [
  { key: "Coffee", label: "☕", comp: Coffee },
  { key: "ShoppingBag", label: "🛍️", comp: ShoppingBag },
  { key: "Car", label: "🚗", comp: Car },
  { key: "Home", label: "🏠", comp: Home },
  { key: "Gamepad2", label: "🎮", comp: Gamepad2 },
  { key: "Heart", label: "❤️", comp: Heart },
  { key: "GraduationCap", label: "🎓", comp: GraduationCap },
  { key: "TrendingUp", label: "📈", comp: TrendingUp },
  { key: "Wallet", label: "💰", comp: Wallet },
];

const COLOR_OPTIONS = ["#FF6B35", "#AB47BC", "#00E5FF", "#22C55E", "#E6B84F", "#EF4444", "#3ECF8E", "#FFD700", "#FF69B4", "#6366F1"];

const defaultPots: Pot[] = [
  { id: "1", name: "Ăn uống", iconKey: "Coffee", allocated: 3600000, color: "#FF6B35" },
  { id: "2", name: "Shopping", iconKey: "ShoppingBag", allocated: 1200000, color: "#AB47BC" },
  { id: "3", name: "Đi lại", iconKey: "Car", allocated: 1000000, color: "#00E5FF" },
  { id: "4", name: "Nhà ở", iconKey: "Home", allocated: 3000000, color: "#22C55E" },
  { id: "5", name: "Giải trí", iconKey: "Gamepad2", allocated: 800000, color: "#E6B84F" },
  { id: "6", name: "Sức khỏe", iconKey: "Heart", allocated: 600000, color: "#EF4444" },
  { id: "7", name: "Học tập", iconKey: "GraduationCap", allocated: 800000, color: "#3ECF8E" },
  { id: "8", name: "Tiết kiệm", iconKey: "TrendingUp", allocated: 1000000, color: "#FFD700" },
];

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function formatVND(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}tr`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatFull(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

/* ─── Add Pot Modal ─── */
function AddPotModal({ onClose, onAdd }: { onClose: () => void; onAdd: (pot: Pot) => void }) {
  const [name, setName] = useState("");
  const [allocated, setAllocated] = useState("");
  const [iconKey, setIconKey] = useState("Wallet");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  const handleSubmit = () => {
    if (!name.trim() || !allocated) return;
    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      iconKey,
      allocated: parseInt(allocated),
      color,
    });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Thêm lọ mới</h3>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1">Tên lọ</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Quỹ du lịch"
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E6B84F]/30" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1">Ngân sách/tháng (VND)</label>
            <input type="number" value={allocated} onChange={(e) => setAllocated(e.target.value)} placeholder="1000000"
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E6B84F]/30" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => setIconKey(opt.key)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all text-lg ${
                    iconKey === opt.key ? "bg-[#E6B84F]/15 border border-[#E6B84F]/30 scale-110" : "bg-white/[0.03] border border-white/[0.06] hover:border-white/10"
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1">Màu</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all border-2 ${color === c ? "scale-110 border-white/60" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={!name.trim() || !allocated}
            className="w-full py-2.5 bg-gradient-to-r from-[#E6B84F] to-[#D4A43F] text-black text-sm font-semibold rounded-lg disabled:opacity-30 hover:shadow-[0_0_20px_rgba(230,184,79,0.2)] transition-all">
            <Check className="w-4 h-4 inline mr-1" /> Tạo lọ
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Log Expense Modal ─── */
function LogExpenseModal({ pot, onClose, onLog }: { pot: Pot; onClose: () => void; onLog: (expense: Expense) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!amount) return;
    onLog({
      id: Date.now().toString(),
      potId: pot.id,
      amount: parseInt(amount),
      note: note.trim() || "Chi tiêu",
      date: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pot.color}15` }}>
            {(() => { const IC = ICON_MAP[pot.iconKey] || Wallet; return <IC className="w-4 h-4" color={pot.color} />; })()}
          </div>
          <h3 className="text-base font-bold text-white">{pot.name}</h3>
          <button onClick={onClose} className="ml-auto p-1 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1">Số tiền (VND)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" autoFocus
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E6B84F]/30" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/25 block mb-1">Ghi chú</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Trà sữa Phúc Long"
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E6B84F]/30" />
          </div>
          {/* Quick-amount chips */}
          <div className="flex flex-wrap gap-1.5">
            {[50000, 100000, 200000, 500000].map((v) => (
              <button key={v} onClick={() => setAmount(v.toString())}
                className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-all ${
                  amount === v.toString() ? "bg-[#E6B84F]/15 text-[#E6B84F] border-[#E6B84F]/20" : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:border-white/10"
                }`}>
                {v >= 1000000 ? `${v/1000000}tr` : `${v/1000}K`}
              </button>
            ))}
          </div>
          <button onClick={handleSubmit} disabled={!amount}
            className="w-full py-2.5 text-sm font-semibold rounded-lg disabled:opacity-30 transition-all"
            style={{ backgroundColor: pot.color, color: "#000" }}>
            <Plus className="w-4 h-4 inline mr-1" /> Ghi chi tiêu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function BudgetPage() {
  const [pots, setPots] = useState<Pot[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState(12000000);
  const [showAddPot, setShowAddPot] = useState(false);
  const [logPot, setLogPot] = useState<Pot | null>(null);
  const [editIncome, setEditIncome] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const savedPots = localStorage.getItem("vietfi_pots");
    const savedExpenses = localStorage.getItem("vietfi_expenses");
    const savedIncome = localStorage.getItem("vietfi_income");
    setPots(savedPots ? JSON.parse(savedPots) : defaultPots);
    setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
    if (savedIncome) setIncome(parseInt(savedIncome));
  }, []);

  // Save to localStorage + Supabase sync
  const save = useCallback((p: Pot[], e: Expense[], i: number) => {
    localStorage.setItem("vietfi_pots", JSON.stringify(p));
    localStorage.setItem("vietfi_expenses", JSON.stringify(e));
    localStorage.setItem("vietfi_income", i.toString());
    // Background Supabase sync
    if (getCachedUserId()) {
      saveBudgetPots(p).catch(() => {});
    }
  }, []);

  const addPot = (pot: Pot) => {
    const newPots = [...pots, pot];
    setPots(newPots);
    save(newPots, expenses, income);
  };

  const removePot = (id: string) => {
    const newPots = pots.filter((p) => p.id !== id);
    const newExpenses = expenses.filter((e) => e.potId !== id);
    setPots(newPots);
    setExpenses(newExpenses);
    save(newPots, newExpenses, income);
  };

  const logExpense = (expense: Expense) => {
    const newExpenses = [...expenses, expense];
    setExpenses(newExpenses);
    save(pots, newExpenses, income);
    addXP("log_expense"); // +10 XP
    // Supabase sync
    if (getCachedUserId()) {
      const pot = pots.find(p => p.id === expense.potId);
      addExpense({ amount: expense.amount, category: pot?.name || "Khác", note: expense.note }).catch(() => {});
    }
  };

  const updateIncome = (val: number) => {
    setIncome(val);
    save(pots, expenses, val);
    setEditIncome(false);
  };

  // Calculate
  const getSpent = (potId: string) => expenses.filter((e) => e.potId === potId).reduce((s, e) => s + e.amount, 0);
  const totalAllocated = pots.reduce((s, p) => s + p.allocated, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = income - totalSpent;

  const pieData = pots.map((p) => ({ name: p.name, value: getSpent(p.id) || p.allocated * 0.01, color: p.color }));
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {/* Header */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">Quỹ Chi tiêu</h1>
            <p className="text-[13px] text-white/40">Quản lý ngân sách theo &ldquo;lọ&rdquo; — click vào lọ để ghi chi tiêu</p>
          </div>
          <button onClick={() => setShowAddPot(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-primary text-black text-xs font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(230,184,79,0.2)] transition-all">
            <Plus className="w-3.5 h-3.5" /> Thêm lọ
          </button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Income - editable */}
        <motion.div variants={fadeIn} className="glass-card p-4 cursor-pointer group" onClick={() => setEditIncome(true)}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">Thu nhập</span>
            <Edit3 className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors" />
          </div>
          {editIncome ? (
            <input type="number" autoFocus value={income} onChange={(e) => setIncome(Number(e.target.value))}
              onBlur={() => updateIncome(income)} onKeyDown={(e) => e.key === "Enter" && updateIncome(income)}
              className="text-xl font-bold mt-1 bg-transparent text-[#22C55E] border-b border-[#22C55E]/30 outline-none w-full" />
          ) : (
            <div className="text-xl font-bold text-[#22C55E] mt-1">{formatVND(income)}</div>
          )}
        </motion.div>
        <motion.div variants={fadeIn} className="glass-card p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">Đã chi</span>
          <div className="text-xl font-bold mt-1" style={{ color: totalSpent > income * 0.8 ? "#EF4444" : "#E6B84F" }}>{formatVND(totalSpent)}</div>
        </motion.div>
        <motion.div variants={fadeIn} className="glass-card p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">Còn lại</span>
          <div className="text-xl font-bold mt-1" style={{ color: remaining > 0 ? "#22C55E" : "#EF4444" }}>{formatVND(remaining)}</div>
        </motion.div>
        <motion.div variants={fadeIn} className="glass-card p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">Đã phân bổ</span>
          <div className="text-xl font-bold text-[#00E5FF] mt-1">{Math.round((totalAllocated / income) * 100)}%</div>
        </motion.div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Pie + Recent */}
        <motion.div variants={fadeIn} className="glass-card p-5 lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-white">Phân bổ chi tiêu</h3>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#F5F3EE", fontSize: 11 }}
                  formatter={(value: unknown) => formatFull(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Recent expenses */}
          {recentExpenses.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-white/20 mb-2">CHI TIÊU GẦN ĐÂY</h4>
              <div className="space-y-1.5">
                {recentExpenses.map((exp) => {
                  const pot = pots.find((p) => p.id === exp.potId);
                  return (
                    <div key={exp.id} className="flex items-center gap-2 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pot?.color || "#888" }} />
                      <span className="text-white/40 flex-1 truncate">{exp.note}</span>
                      <span className="text-white/60 font-medium">-{formatVND(exp.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Pots Grid */}
        <motion.div variants={stagger} className="lg:col-span-2 grid sm:grid-cols-2 gap-3">
          {pots.map((pot) => {
            const spent = getSpent(pot.id);
            const percent = pot.allocated > 0 ? Math.round((spent / pot.allocated) * 100) : 0;
            const overBudget = spent > pot.allocated;
            const nearLimit = percent >= 80 && !overBudget;
            const Icon = ICON_MAP[pot.iconKey] || Wallet;

            return (
              <motion.div key={pot.id} variants={fadeIn}
                className="glass-card glass-card-hover p-4 transition-all cursor-pointer group relative"
                onClick={() => setLogPot(pot)}>

                {/* Delete button */}
                <button onClick={(e) => { e.stopPropagation(); removePot(pot.id); }}
                  className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 bg-[#EF4444]/10 text-[#EF4444]/60 hover:text-[#EF4444] transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pot.color}15` }}>
                    <Icon className="w-4 h-4" color={pot.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{pot.name}</h4>
                    <p className="text-[10px] text-white/30">{formatVND(spent)} / {formatVND(pot.allocated)}</p>
                  </div>
                  <span className={`text-xs font-bold ${overBudget ? "text-[#EF4444]" : nearLimit ? "text-[#E6B84F]" : "text-[#22C55E]"}`}>
                    {percent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percent, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ backgroundColor: overBudget ? "#EF4444" : nearLimit ? "#E6B84F" : pot.color }}
                  />
                </div>

                {overBudget && (
                  <p className="text-[10px] text-[#EF4444] mt-1.5 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Vượt {formatVND(spent - pot.allocated)}
                  </p>
                )}

                {/* Velocity alert */}
                {!overBudget && spent > 0 && (() => {
                  const today = new Date();
                  const dayOfMonth = today.getDate();
                  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                  const remaining = pot.allocated - spent;
                  const daysLeft = daysInMonth - dayOfMonth;
                  const dailyRate = dayOfMonth > 0 ? Math.round(spent / dayOfMonth) : 0;
                  const projectedTotal = dailyRate * daysInMonth;
                  const willOvershoot = projectedTotal > pot.allocated && daysLeft > 0;
                  if (percent >= 50 && daysLeft > 0) {
                    return (
                      <p className={`text-[10px] mt-1.5 flex items-center gap-1 ${willOvershoot ? 'text-[#E6B84F]' : 'text-white/25'}`}>
                        {willOvershoot && <AlertTriangle className="w-3 h-3" />}
                        📅 Còn {daysLeft} ngày — {formatVND(dailyRate)}/ngày {willOvershoot ? `→ dự kiến hết trước ${daysLeft > 3 ? Math.round(remaining / dailyRate) : 1} ngày` : ''}
                      </p>
                    );
                  }
                  return null;
                })()}
              </motion.div>
            );
          })}

          {/* Empty state */}
          {pots.length === 0 && (
            <motion.div variants={fadeIn} className="sm:col-span-2 glass-card p-8 text-center">
              <span className="text-4xl">🦜</span>
              <h3 className="text-sm font-semibold text-white mt-3">Chưa có lọ nào!</h3>
              <p className="text-xs text-white/30 mt-1">Tạo lọ đầu tiên để bắt đầu quản lý chi tiêu</p>
              <button onClick={() => setShowAddPot(true)}
                className="mt-3 px-4 py-2 bg-gradient-primary text-black text-xs font-semibold rounded-lg">
                <Plus className="w-3 h-3 inline mr-1" /> Tạo lọ
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddPot && <AddPotModal onClose={() => setShowAddPot(false)} onAdd={addPot} />}
        {logPot && <LogExpenseModal pot={logPot} onClose={() => setLogPot(null)} onLog={logExpense} />}
      </AnimatePresence>
    </motion.div>
  );
}
