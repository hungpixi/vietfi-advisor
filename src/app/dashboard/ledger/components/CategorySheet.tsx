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
            className="fixed bottom-0 left-0 right-0 z-50 glass-card rounded-b-none"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-600" />
            </div>

            {/* Title */}
            <div className="px-4 pb-3 border-b border-[--color-border]">
              <p className="text-sm font-semibold text-gray-300">{title}</p>
            </div>

            {/* Category grid */}
            <div className="p-4 grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {categories.map((cat) => {
                const isSelected = selected === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      onSelect(cat.name);
                      onClose();
                    }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-yellow-500/60 bg-yellow-500/10'
                        : 'border-[--color-border] hover:border-gray-500'
                    }`}
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <span
                      className={`text-xs text-center ${
                        isSelected ? 'text-yellow-400 font-semibold' : 'text-gray-400'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
