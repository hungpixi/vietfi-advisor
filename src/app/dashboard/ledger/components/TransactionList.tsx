'use client';
import type { LedgerEntry } from '@/lib/calculations/ledger-summary';
import TransactionItem from './TransactionItem';
import { TrendingUp } from 'lucide-react';

interface Props {
  transactions: LedgerEntry[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onAddFirst: () => void;
}

const VIETNAMESE_DAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(d);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) return 'Hôm nay';
  if (dateOnly.getTime() === yesterday.getTime()) return 'Hôm qua';

  const dayName = VIETNAMESE_DAY[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export default function TransactionList({
  transactions,
  loading,
  onDelete,
  onAddFirst,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 bg-gray-800/50 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.01]">
        <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
          <TrendingUp className="w-10 h-10 text-white/20" />
        </div>
        <p className="mt-6 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Hệ thống chưa ghi nhận giao dịch</p>
        <button
          onClick={onAddFirst}
          className="mt-6 bg-[#22C55E] text-black font-heading text-[12px] font-black uppercase tracking-widest px-8 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all"
        >
          + Khởi tạo giao dịch
        </button>
      </div>
    );
  }

  // Group by date
  const groups = transactions.reduce<Record<string, LedgerEntry[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8 pb-10">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#22C55E]/60 mb-3 px-2 flex items-center gap-3">
            <span className="shrink-0">{formatDateGroup(date)}</span>
            <div className="h-[1px] w-full bg-gradient-to-r from-[#22C55E]/20 to-transparent" />
          </div>
          <div className="space-y-3">
            {groups[date].map((entry) => (
              <TransactionItem key={entry.id} entry={entry} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
