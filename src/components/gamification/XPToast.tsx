"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Star, Zap, Trophy } from "lucide-react";

interface XPToast {
  id: number;
  xp: number;
  action: string;
  levelUp?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  log_expense: "✏️ Ghi chi tiêu",
  check_market: "📊 Check thị trường",
  pay_debt: "💳 Trả nợ",
  complete_quest: "🎯 Hoàn thành quest",
  quiz_correct: "🧠 Quiz đúng",
  setup_budget: "📋 Setup ngân sách",
  read_knowledge: "📰 Đọc kiến thức",
  customize_cpi: "📈 Tuỳ chỉnh CPI",
  complete_onboarding: "🎉 Hoàn thành setup",
};

export function useXPToast() {
  const [toasts, setToasts] = useState<XPToast[]>([]);

  const showToast = useCallback((xp: number, action: string, levelUp?: boolean) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, xp, action, levelUp }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return { toasts, showToast };
}

export function XPToastContainer({ toasts }: { toasts: XPToast[] }) {
  return (
    <div className="fixed top-16 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[#E6B84F]/20 rounded-2xl blur-xl" />
            
            <div className="relative flex items-center gap-3 px-4 py-3 bg-[#1A1B23]/95 backdrop-blur-xl rounded-2xl border border-[#E6B84F]/20 shadow-[0_0_30px_rgba(230,184,79,0.15)]">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E6B84F] to-[#FFD700] flex items-center justify-center shadow-[0_0_15px_rgba(230,184,79,0.3)]">
                {toast.levelUp ? (
                  <Trophy className="w-5 h-5 text-black" />
                ) : toast.xp >= 50 ? (
                  <Star className="w-5 h-5 text-black" />
                ) : (
                  <Zap className="w-5 h-5 text-black" />
                )}
              </div>
              
              {/* Content */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-[#E6B84F]">+{toast.xp} XP</span>
                  {toast.levelUp && (
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: 2, duration: 0.3 }}
                      className="text-xs px-2 py-0.5 bg-[#22C55E]/20 text-[#22C55E] rounded-full font-bold"
                    >
                      LEVEL UP! 🎉
                    </motion.span>
                  )}
                </div>
                <span className="text-[11px] text-white/40">
                  {ACTION_LABELS[toast.action] || toast.action}
                </span>
              </div>

              {/* Particles */}
              {toast.xp >= 20 && (
                <div className="absolute -top-1 -right-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{
                        opacity: 0,
                        scale: 0,
                        x: (i - 1) * 15,
                        y: -20 - i * 10,
                      }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="absolute w-1.5 h-1.5 bg-[#E6B84F] rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
