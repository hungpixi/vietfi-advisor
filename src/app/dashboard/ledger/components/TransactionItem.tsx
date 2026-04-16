'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatVND } from '@/lib/stores/ledger-store';
import type { LedgerEntry } from '@/lib/calculations/ledger-summary';

interface Props {
  entry: LedgerEntry;
  onDelete: (id: string) => void;
}

const CATEGORY_MAP: Record<string, { emoji: string; name: string }> = {
  'Ăn uống': { emoji: '🍜', name: 'Ăn uống' },
  'Đi lại': { emoji: '🚗', name: 'Đi lại' },
  'Nhà ở': { emoji: '🏠', name: 'Nhà ở' },
  'Y tế': { emoji: '💊', name: 'Y tế' },
  'Học tập': { emoji: '📚', name: 'Học tập' },
  'Giải trí': { emoji: '🎮', name: 'Giải trí' },
  'Mua sắm': { emoji: '🛍️', name: 'Mua sắm' },
  'Đầu tư': { emoji: '📈', name: 'Đầu tư' },
  'Từ thiện': { emoji: '🎁', name: 'Từ thiện' },
  'Lương': { emoji: '💼', name: 'Lương' },
  'Thưởng': { emoji: '🎁', name: 'Thưởng' },
  'Thêm ca': { emoji: '🔄', name: 'Thêm ca' },
  'Quà tặng': { emoji: '🎁', name: 'Quà tặng' },
  'Khác': { emoji: '🔄', name: 'Khác' },
};

export default function TransactionItem({ entry, onDelete }: Props) {
  const [showNote, setShowNote] = useState(false);
  const cat =
    CATEGORY_MAP[entry.category] ?? { emoji: '🔄', name: entry.category };
  const time = new Date(entry.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const isIncome = entry.type === 'income';
  const amountColor = isIncome ? 'text-green-400' : 'text-red-400';
  const amountPrefix = isIncome ? '+' : '-';

  return (
    <div className="relative group overflow-hidden rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] transition-all duration-300 hover:border-[#22C55E]/20">
      <motion.div
        className="px-4 py-3 flex items-center justify-between cursor-pointer relative z-10"
        whileTap={{ scale: 0.98 }}
        onClick={() => entry.note && setShowNote(!showNote)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-xl shadow-inner">
            {cat.emoji}
          </div>
          <div className="min-w-0">
            <div className="font-heading text-[13px] font-black uppercase tracking-wide text-white/90">{cat.name}</div>
            {entry.note && (
              <div className="font-mono text-[10px] text-white/40 truncate mt-0.5">{entry.note}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 ml-3">
          <div className="text-right">
            <span className={`block font-heading text-[14px] font-black tracking-tight ${isIncome ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {amountPrefix}{formatVND(entry.amount)}
            </span>
            <span className="block font-mono text-[9px] text-white/20 uppercase font-black text-right">{time}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-red-500/10 text-red-500/60 hover:text-red-500 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      </motion.div>

      {/* Subtle bottom line Decor */}
      <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}
