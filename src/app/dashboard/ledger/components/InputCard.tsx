'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseVNDInput, formatVND } from '@/lib/stores/ledger-store';
import type { LedgerEntry } from '@/lib/calculations/ledger-summary';
import { cn } from '@/lib/utils';
import { Plus, X, Calendar, Edit3, ArrowUpRight } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  { name: 'Ăn uống', emoji: '🍜' },
  { name: 'Đi lại', emoji: '🚗' },
  { name: 'Nhà ở', emoji: '🏠' },
  { name: 'Y tế', emoji: '💊' },
  { name: 'Học tập', emoji: '📚' },
  { name: 'Giải trí', emoji: '🎮' },
  { name: 'Mua sắm', emoji: '🛍️' },
  { name: 'Đầu tư', emoji: '📈' },
  { name: 'Từ thiện', emoji: '🎁' },
  { name: 'Khác', emoji: '🔄' },
] as const;

const INCOME_CATEGORIES = [
  { name: 'Lương', emoji: '💼' },
  { name: 'Thưởng', emoji: '🎁' },
  { name: 'Thêm ca', emoji: '🔄' },
  { name: 'Đầu tư', emoji: '📈' },
  { name: 'Quà tặng', emoji: '🎁' },
  { name: 'Khác', emoji: '🔄' },
] as const;

type EntryType = 'income' | 'expense';

interface Props {
  onAdd: (data: Omit<LedgerEntry, 'id' | 'createdAt'>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const TODAY = new Date().toISOString().split('T')[0];

export default function InputCard({ onAdd, isOpen, onToggle }: Props) {
  const [type, setType] = useState<EntryType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(TODAY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const amountRef = useRef<HTMLInputElement>(null);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const amount = parseVNDInput(amountStr);
    if (!amountStr.trim() || amount <= 0) {
      errs.amount = 'Vui lòng nhập số tiền hợp lệ';
    }
    if (!category) {
      errs.category = 'Vui lòng chọn danh mục';
    }
    if (!date) {
      errs.date = 'Vui lòng chọn ngày';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const amount = parseVNDInput(amountStr);
    onAdd({ amount, type, category, note, date });
    setAmountStr('');
    setCategory('');
    setNote('');
    setDate(TODAY);
    setErrors({});
    onToggle();
  }

  function handleAmountBlur() {
    const amount = parseVNDInput(amountStr);
    if (amount > 0) {
      setAmountStr(new Intl.NumberFormat('vi-VN').format(amount));
    }
  }

  const isLargeAmount = parseVNDInput(amountStr) > 1_000_000;

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border transition-all duration-500 bg-[#08110f] shadow-[0_24px_80px_rgba(0,0,0,0.42)]",
      isOpen ? "border-[#22C55E]/40 ring-1 ring-[#22C55E]/20" : "border-white/10 hover:border-[#22C55E]/20"
    )}>
      {/* Background System */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)] z-0" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:24px_24px] z-0" />

      {/* Toggle header */}
      <button
        onClick={onToggle}
        className="relative z-10 w-full px-6 py-4 flex items-center justify-between group/header transition-all overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300",
            isOpen ? "bg-[#22C55E]/20 border-[#22C55E]/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "bg-white/5 border-white/5"
          )}>
            {isOpen ? <X className="w-4 h-4 text-[#22C55E]" /> : <Plus className="w-4 h-4 text-white/60" />}
          </div>
          <span className={cn(
            "font-heading text-[13px] font-black uppercase tracking-widest transition-colors",
            isOpen ? "text-[#22C55E]" : "text-white/60 group-hover/header:text-white"
          )}>
            {isOpen ? 'ĐÓNG FORM NHẬP' : 'KHỞI TẠO GIAO DỊCH'}
          </span>
        </div>

        {!isOpen && (
          <div className="flex items-center gap-2 opacity-0 group-hover/header:opacity-100 transition-all duration-300">
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#22C55E]">QUICK ACTION</span>
            <ArrowUpRight className="w-3 h-3 text-[#22C55E]" />
          </div>
        )}
      </button>

      {/* Expandable form */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden relative z-10"
          >
            <div className="px-6 pb-6 space-y-6">
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />

              {/* Income / Expense toggle */}
              <div className="grid grid-cols-2 gap-3">
                {(['expense', 'income'] as EntryType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setType(t);
                      setCategory('');
                    }}
                    className={cn(
                      "group relative flex items-center justify-center gap-3 py-3 rounded-xl font-heading text-[11px] font-black uppercase tracking-widest transition-all duration-300 overflow-hidden border",
                      type === t
                        ? t === 'income'
                          ? "bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E] shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                          : "bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444]"
                        : "bg-white/[0.02] border-white/5 text-white/30 hover:border-white/20 hover:text-white/60"
                    )}
                  >
                    <span className="relative z-10">{t === 'income' ? '💰 THU NHẬP' : '💸 CHI TIÊU'}</span>
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/20 px-1">MỨC GIAO DỊCH (VND)</label>
                <div className={cn(
                  "relative flex items-center border rounded-2xl overflow-hidden transition-all duration-300 bg-black/20",
                  errors.amount ? "border-[#EF4444]/40" : "border-white/5 focus-within:border-[#22C55E]/40 focus-within:ring-1 ring-[#22C55E]/20"
                )}>
                  <input
                    ref={amountRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '');
                      setAmountStr(raw);
                    }}
                    onBlur={handleAmountBlur}
                    className="flex-1 bg-transparent px-6 py-5 text-4xl font-heading font-black text-white text-right outline-none placeholder:text-white/5 tracking-tighter"
                  />
                  <span className="pr-6 font-heading text-xl font-black text-white/30 uppercase">đ</span>
                </div>
                {errors.amount && (
                  <p className="font-mono text-[9px] font-black uppercase tracking-wider text-[#EF4444] px-1">{errors.amount}</p>
                )}
              </div>

              {/* Category chips */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/20 px-1">PHÂN LOẠI DANH MỤC</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setCategory(cat.name)}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-xl text-[11px] font-heading font-black uppercase tracking-wider flex items-center gap-2 border transition-all duration-300",
                        category === cat.name
                          ? "bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.15)] scale-105"
                          : "bg-white/[0.03] border-white/5 text-white/40 hover:border-white/20 hover:text-white/70"
                      )}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="font-mono text-[9px] font-black uppercase tracking-wider text-[#EF4444] px-1">{errors.category}</p>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/20 px-1">THỜI GIAN</label>
                  <div className="relative group/input">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within/input:text-[#22C55E] transition-colors" />
                    <input
                      type="date"
                      value={date}
                      max={TODAY}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-10 pr-4 py-3 font-mono text-[11px] font-black uppercase tracking-wider text-white/70 outline-none focus:border-[#22C55E]/40 focus:bg-white/[0.05] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/20 px-1">GHI CHÚ HÀNH VI</label>
                  <div className="relative group/input">
                    <Edit3 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within/input:text-[#22C55E] transition-colors" />
                    <input
                      type="text"
                      placeholder="Mô tả ngắn..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-10 pr-4 py-3 font-mono text-[11px] font-black uppercase tracking-wider text-white placeholder:text-white/10 outline-none focus:border-[#22C55E]/40 focus:bg-white/[0.05] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Large amount alert */}
              <AnimatePresence>
                {isLargeAmount && amountStr && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border border-[#FFD700]/30 bg-[#FFD700]/10 rounded-xl px-4 py-3 flex items-start gap-3"
                  >
                    <span className="text-lg">⚠️</span>
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#FFD700] leading-normal">
                      HỆ THỐNG PHÁT HIỆN GIAO DỊCH QUY MÔ LỚN ({formatVND(parseVNDInput(amountStr))}).
                      VUI LÒNG KIỂM TRA LẠI SỐ LIỆU ĐỂ ĐẢM BẢO CHÍNH XÁC.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit CTA */}
              <button
                onClick={handleSubmit}
                className="group relative w-full bg-[#22C55E] text-black font-heading text-[14px] font-black uppercase tracking-[0.2em] py-4 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.1)] hover:shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:scale-[1.01] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-2">XÁC THỰC & LƯU HỆ THỐNG</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
