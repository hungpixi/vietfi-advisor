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
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#08110f] py-4 px-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#22C55E]/20 sticky top-0 z-30">
      {/* Background System */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* Corner Decorators */}
      <div className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-white/20" />
      <div className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-white/10" />

      <div className="relative z-10">
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#22C55E]/60 mb-3 group-hover:text-[#22C55E] transition-colors">
          TỔNG KẾT {PERIOD_LABELS[period]}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="font-mono text-[9px] font-black uppercase tracking-wider text-white/30">Thu nhập</div>
            <div className="font-heading text-[16px] md:text-[20px] font-black tracking-tighter text-[#22C55E] drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              {formatVND(totalIncome)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-mono text-[9px] font-black uppercase tracking-wider text-white/30">Chi tiêu</div>
            <div className="font-heading text-[16px] md:text-[20px] font-black tracking-tighter text-[#EF4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]">
              {formatVND(totalExpense)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-mono text-[9px] font-black uppercase tracking-wider text-white/30">Còn lại</div>
            <div className={`font-heading text-[16px] md:text-[20px] font-black tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] ${netBalance >= 0 ? 'text-[#00E5FF]' : 'text-[#EF4444]'
              }`}>
              {formatVND(netBalance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
