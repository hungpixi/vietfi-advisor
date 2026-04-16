'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseVNDInput, formatVND } from '@/lib/stores/ledger-store';
import type { LedgerEntry } from '@/lib/calculations/ledger-summary';

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
    // Reset form
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
    <div className="glass-card overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:opacity-90 transition-opacity"
      >
        <span className="text-sm font-medium">
          {isOpen ? 'Đóng' : '+ Thêm giao dịch'}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-lg font-bold"
        >
          +
        </motion.span>
      </button>

      {/* Expandable form */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Income / Expense toggle */}
              <div className="flex gap-2">
                {(['expense', 'income'] as EntryType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setType(t);
                      setCategory('');
                    }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${
                      type === t
                        ? t === 'income'
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'border-[--color-border] text-gray-500'
                    }`}
                  >
                    {t === 'income' ? '💰 Thu nhập' : '💸 Chi tiêu'}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div>
                <div className="flex items-center border border-[--color-border] rounded-xl overflow-hidden focus-within:border-yellow-500/60 transition-colors">
                  <input
                    ref={amountRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => {
                      // Strip non-digits for live typing
                      const raw = e.target.value.replace(/[^\d]/g, '');
                      setAmountStr(raw);
                    }}
                    onBlur={handleAmountBlur}
                    className="flex-1 bg-transparent px-4 py-3 text-3xl font-bold text-right outline-none placeholder:text-gray-600"
                    style={{ fontSize: '2rem' }}
                  />
                  <span className="pr-4 text-lg text-gray-400 font-medium">đ</span>
                </div>
                {errors.amount && (
                  <p className="text-red-400 text-sm mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Category chips — horizontal scroll */}
              <div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setCategory(cat.name)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 border transition-all ${
                        category === cat.name
                          ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400'
                          : 'border-[--color-border] text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="text-red-400 text-sm mt-1">{errors.category}</p>
                )}
              </div>

              {/* Date + Note row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="date"
                    value={date}
                    max={TODAY}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[--color-bg-card] border border-[--color-border] rounded-xl px-3 py-2 text-sm text-gray-300 outline-none focus:border-yellow-500/60"
                  />
                  {errors.date && (
                    <p className="text-red-400 text-sm mt-1">{errors.date}</p>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Ghi chú (tùy chọn)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 bg-[--color-bg-card] border border-[--color-border] rounded-xl px-3 py-2 text-sm text-gray-300 outline-none focus:border-yellow-500/60 placeholder:text-gray-600"
                />
              </div>

              {/* Large amount inline confirmation */}
              <AnimatePresence>
                {isLargeAmount && amountStr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-yellow-500/30 bg-yellow-500/10 rounded-xl px-4 py-3"
                  >
                    <p className="text-sm text-yellow-400">
                      ⚠️ Số tiền lớn ({formatVND(parseVNDInput(amountStr))}). Xác nhận đúng
                      khoản chi tiêu này nhé!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit CTA */}
              <button
                onClick={handleSubmit}
                className="w-full bg-gradient-primary text-black font-bold py-3 rounded-xl
                           hover:opacity-90 transition-opacity"
              >
                Lưu giao dịch
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
