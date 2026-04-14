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
  check_market: "/dashboard/sentiment",
  setup_budget: "/dashboard/budget",
  read_knowledge: "/dashboard/macro",
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
  }, []);

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
          "glass-card p-4 mb-4 transition-all duration-500",
          allDone && "border-[#22C55E]/20 shadow-[0_0_20px_rgba(34,197,94,0.08)]",
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">{allDone ? "🎉" : "🎯"}</span>
            <h3 className="text-xs font-semibold text-white">Nhiệm vụ hôm nay</h3>
            {/* Progress ring */}
            <div className="relative w-5 h-5">
              <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke={allDone ? "#22C55E" : "#E6B84F"}
                  strokeWidth="2"
                  strokeDasharray={`${progress * 0.502} 50.2`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/40">
                {completedCount}/{quests.length}
              </span>
            </div>
          </div>
          {allDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] rounded-full font-bold"
            >
              ✅ Xuất sắc!
            </motion.span>
          )}
        </div>

        <div className="space-y-1.5">
          {quests.map((q) => (
            <Link
              key={q.id}
              href={questLinks[q.actionKey] || "/dashboard"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                q.completed
                  ? "bg-[#22C55E]/5 border border-[#22C55E]/10"
                  : "bg-white/[0.02] border border-white/[0.04] hover:border-[#E6B84F]/20 hover:bg-[#E6B84F]/[0.02]"
              )}
            >
              <motion.span
                className="text-sm"
                animate={q.completed ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {q.completed ? "✅" : q.icon}
              </motion.span>
              <div className="flex-1">
                <span
                  className={cn(
                    "text-xs font-medium",
                    q.completed ? "text-[#22C55E]/60 line-through" : "text-white/70"
                  )}
                >
                  {q.title}
                </span>
                <p className="text-[10px] text-white/20">{q.description}</p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-mono font-bold",
                  q.completed ? "text-[#22C55E]/40" : "text-[#E6B84F]"
                )}
              >
                +{q.xp} XP
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  );
}
