'use client';
import type { LedgerEntry } from '@/lib/calculations/ledger-summary';
import TransactionItem from './TransactionItem';
import AnimatedParrot from '@/components/vet-vang/AnimatedParrot';

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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AnimatedParrot size={80} state="idle" />
        <p className="mt-4 text-gray-400">Chưa có giao dịch nào</p>
        <button
          onClick={onAddFirst}
          className="mt-3 bg-gradient-primary text-black font-semibold px-6 py-2 rounded-xl"
        >
          + Thêm giao dịch đầu tiên
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
    <div className="space-y-4">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
            {formatDateGroup(date)}
          </div>
          <div className="space-y-2">
            {groups[date].map((entry) => (
              <TransactionItem key={entry.id} entry={entry} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
