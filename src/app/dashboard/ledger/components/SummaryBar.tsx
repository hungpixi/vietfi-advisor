'use client';
import { formatVND } from '@/lib/stores/ledger-store';
import type { LedgerSummary } from '@/lib/calculations/ledger-summary';

interface Props {
  summary: LedgerSummary;
  period: 'today' | 'month';
}

const PERIOD_LABELS: Record<string, string> = {
  today: 'Hôm nay',
  month: 'Tháng này',
};

export default function SummaryBar({ summary, period }: Props) {
  const { totalIncome, totalExpense, netBalance } = summary;

  return (
    <div className="glass-card sticky top-0 z-30 py-3 px-4">
      <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
        {PERIOD_LABELS[period]}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-gray-400">Thu nhập</div>
          <div className="text-green-400 font-bold text-sm">
            +{formatVND(totalIncome)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Chi tiêu</div>
          <div className="text-red-400 font-bold text-sm">
            -{formatVND(totalExpense)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Còn lại</div>
          <div
            className={`font-bold text-sm ${
              netBalance >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {netBalance >= 0 ? '+' : ''}
            {formatVND(netBalance)}
          </div>
        </div>
      </div>
    </div>
  );
}
