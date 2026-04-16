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
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-max"
        >
          <div className="relative overflow-hidden rounded-full border border-white/10 bg-[#08110f]/90 backdrop-blur-md px-6 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#22C55E]/5 to-transparent z-0" />

            <span className="relative z-10 font-mono text-[10px] font-black uppercase tracking-wider text-white/70">
              {isAdd ? 'ĐÃ GHI NHẬN' : 'ĐÃ GỠ BỎ'}:{' '}
              <span className={item.entry.type === 'income' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                {prefix}{formatVND(item.entry.amount)}
              </span>
              {' — '}{item.entry.category}
            </span>

            <button
              onClick={onUndo}
              className="relative z-10 px-4 py-1.5 rounded-full bg-[#22C55E] text-black font-heading text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all"
            >
              HOÀN TÁC
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
