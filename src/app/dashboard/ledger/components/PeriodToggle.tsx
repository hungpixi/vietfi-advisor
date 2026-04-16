'use client';
import { motion } from 'framer-motion';

interface Props {
  period: 'today' | 'month';
  onChange: (p: 'today' | 'month') => void;
}

const OPTIONS: Array<{ value: 'today' | 'month'; label: string }> = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'month', label: 'Tháng này' },
];

export default function PeriodToggle({ period, onChange }: Props) {
  return (
    <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl w-full max-w-sm mb-4 shadow-inner">
      {OPTIONS.map((opt) => {
        const isActive = period === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative flex-1 flex items-center justify-center px-4 py-2 rounded-lg text-[11px] font-mono font-black uppercase tracking-wider transition-all duration-300 overflow-hidden group ${isActive
                ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
              }`}
          >
            <span className="relative z-10">{opt.label}</span>
            {isActive && (
              <motion.div
                layoutId="period-indicator"
                className="absolute inset-0 bg-radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_70%)"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
