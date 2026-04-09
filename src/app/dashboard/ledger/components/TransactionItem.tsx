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
    <div className="relative overflow-hidden">
      <motion.div
        className="glass-card px-4 py-3 flex items-center justify-between cursor-pointer"
        whileTap={{ scale: 0.98 }}
        onClick={() => entry.note && setShowNote(!showNote)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{cat.emoji}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{cat.name}</div>
            {entry.note && (
              <div className="text-xs text-gray-500 truncate">{entry.note}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className={`font-bold ${amountColor}`}>
            {amountPrefix}
            {formatVND(entry.amount)}
          </span>
          <span className="text-xs text-gray-500">{time}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="text-xs text-red-400 ml-1 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </div>
  );
}
