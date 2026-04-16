'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryItem {
  name: string;
  emoji: string;
}

interface Props {
  open: boolean;
  title: string;
  categories: readonly CategoryItem[];
  selected: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function CategorySheet({
  open,
  title,
  categories,
  selected,
  onSelect,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60"
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden outline-none"
          >
            <div className="relative rounded-t-3xl border-t border-white/10 bg-[#08110f] shadow-[0_-24px_80px_rgba(0,0,0,0.5)]">
              {/* Background System */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.95)_0%,rgba(7,11,20,0.98)_72%)] z-0" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:24px_24px] z-0" />

              <div className="relative z-10 px-6">
                {/* Handle */}
                <div className="flex justify-center pt-4 pb-2">
                  <div className="w-12 h-1 rounded-full bg-white/10" />
                </div>

                {/* Title */}
                <div className="pb-4 border-b border-white/5">
                  <p className="font-heading text-[14px] font-black uppercase tracking-widest text-[#22C55E] text-center">{title}</p>
                </div>

                {/* Category grid */}
                <div className="p-6 grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                  {categories.map((cat) => {
                    const isSelected = selected === cat.name;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => {
                          onSelect(cat.name);
                          onClose();
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 ${isSelected
                            ? 'border-[#22C55E]/40 bg-[#22C55E]/10 shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-105'
                            : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                          }`}
                      >
                        <span className="text-3xl">{cat.emoji}</span>
                        <span
                          className={`font-heading text-[11px] font-black uppercase tracking-wider text-center ${isSelected ? 'text-[#22C55E]' : 'text-white/40'
                            }`}
                        >
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="h-4" /> {/* SafeArea padding */}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
