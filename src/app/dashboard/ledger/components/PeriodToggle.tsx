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
    <div className="flex gap-1 bg-[--color-bg-card] rounded-xl p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative ${
            period === opt.value ? 'text-white' : 'text-gray-500'
          }`}
        >
          {opt.label}
          {period === opt.value && (
            <motion.div
              layoutId="period-indicator"
              className="absolute inset-0 bg-gradient-primary rounded-lg -z-10"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
