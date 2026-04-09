'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { LedgerEntry } from '@/lib/calculations/ledger-summary';
import { formatVND } from '@/lib/stores/ledger-store';

interface UndoItem {
  action: 'add' | 'delete';
  entry: LedgerEntry;
}

interface Props {
  visible: boolean;
  item: UndoItem | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export default function UndoToast({
  visible,
  item,
  onUndo,
  onDismiss,
}: Props) {
  if (!item) return null;
  const isAdd = item.action === 'add';
  const prefix = item.entry.type === 'income' ? '+' : '-';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="glass-card px-4 py-3 flex items-center gap-3 shadow-xl">
            <span className="text-sm">
              {isAdd ? 'Đã thêm' : 'Đã xóa'}{' '}
              {prefix}
              {formatVND(item.entry.amount)}{' '}
              {item.entry.category}
            </span>
            <button
              onClick={onUndo}
              className="text-yellow-400 text-sm font-semibold hover:text-yellow-300"
            >
              Hoàn tác
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
