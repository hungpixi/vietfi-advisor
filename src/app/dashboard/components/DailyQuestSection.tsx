"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDailyQuests, type DailyQuest } from "@/lib/gamification";
import { ConfettiCannon, QuestCompleteToast } from "@/components/gamification/Celebration";
import { cn } from "@/lib/utils";

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const questLinks: Record<string, string> = {
  log_expense: "/dashboard/budget",
  check_market: "/dashboard/market-overview?tab=tam-ly",
  setup_budget: "/dashboard/budget",
  read_knowledge: "/dashboard/market-overview?tab=vi-mo",
};

interface DailyQuestSectionProps {
  className?: string;
}

export function DailyQuestSection({ className }: DailyQuestSectionProps) {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const prevDoneRef = useRef(0);
  const questsRef = useRef<DailyQuest[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastQuest, setToastQuest] = useState({ name: "", xp: 0 });

  useEffect(() => {
    const check = () => {
      const q = getDailyQuests();
      const nowDone = q.filter((x) => x.completed).length;
      const prev = prevDoneRef.current;

      // Quest vừa complete → show toast
      if (nowDone > prev && prev > 0) {
        const justDone = q.find(
          (x) => x.completed && !questsRef.current.find((old) => old.id === x.id && old.completed)
        );
        if (justDone) {
          setToastQuest({ name: justDone.title, xp: justDone.xp });
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2500);
        }
      }

      // All done → confetti!
      if (nowDone === q.length && nowDone > 0 && prev < q.length) {
        setShowConfetti(true);
      }

      prevDoneRef.current = nowDone;
      questsRef.current = q;
      setQuests(q);
    };

    check();
    const t = setInterval(check, 2000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = quests.filter((q) => q.completed).length;
  const allDone = completedCount === quests.length && quests.length > 0;
  const progress = quests.length > 0 ? (completedCount / quests.length) * 100 : 0;

  return (
    <>
      <ConfettiCannon active={showConfetti} onDone={() => setShowConfetti(false)} />
      <QuestCompleteToast show={showToast} questName={toastQuest.name} xp={toastQuest.xp} />

      <motion.div
        variants={fadeIn}
        className={cn(
          "glass-card p-12 mb-6 transition-all duration-500",
          allDone && "border-[#22C55E]/30 shadow-[0_0_30px_rgba(34,197,94,0.12)]",
          className
        )}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <span className="text-4xl">{allDone ? "🎉" : "🎯"}</span>
            <h3 className="text-[18px] font-black text-white uppercase font-heading">Nhiệm vụ hôm nay</h3>
            {/* Progress ring */}
            <div className="relative w-9 h-9">
              <svg viewBox="0 0 20 20" className="w-9 h-9 -rotate-90">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke={allDone ? "#22C55E" : "#E6B84F"}
                  strokeWidth="3"
                  strokeDasharray={`${progress * 0.502} 50.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/40 font-mono">
                {completedCount}/{quests.length}
              </span>
            </div>
          </div>
          {allDone && (
            <motion.span
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-xs px-4 py-2 bg-[#22C55E]/20 text-[#22C55E] rounded-full font-black uppercase tracking-[0.15em] shadow-[0_0_15px_rgba(34,197,94,0.2)]"
            >
              ✅ Xuất sắc!
            </motion.span>
          )}
        </div>

        <div className="space-y-4">
          {quests.map((q) => (
            <Link
              key={q.id}
              href={questLinks[q.actionKey] || "/dashboard"}
              className={cn(
                "flex items-center gap-5 px-6 py-5 rounded-3xl transition-all duration-300",
                q.completed
                  ? "bg-[#22C55E]/5 border border-[#22C55E]/20 opacity-80"
                  : "bg-white/[0.04] border border-white/[0.08] hover:border-[#E6B84F]/40 hover:bg-[#E6B84F]/[0.05] hover:scale-[1.01] active:scale-[0.99]"
              )}
            >
              <motion.span
                className="text-3xl"
                animate={q.completed ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                {q.completed ? "✅" : q.icon}
              </motion.span>
              <div className="flex-1">
                <span
                  className={cn(
                    "text-[16px] font-black uppercase leading-tight block mb-1",
                    q.completed ? "text-[#22C55E]/50 line-through" : "text-white/90"
                  )}
                >
                  {q.title}
                </span>
                <p className={cn(
                  "text-[14px] font-medium opacity-50",
                  q.completed ? "text-[#22C55E]/40" : "text-white/40"
                )}>{q.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1 min-w-[60px]">
                <span
                  className={cn(
                    "text-base md:text-lg font-black font-mono tracking-tighter",
                    q.completed ? "text-[#22C55E]/40" : "text-[#E6B84F] drop-shadow-[0_0_8px_rgba(230,184,79,0.3)]"
                  )}
                >
                  +{q.xp}
                </span>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  q.completed ? "text-[#22C55E]/30" : "text-[#E6B84F]/50"
                )}>XP</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  );
}
