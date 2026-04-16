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
          "glass-card p-8 md:p-12 mb-6 transition-all duration-500 relative overflow-hidden group border border-white/10",
          allDone && "border-[#22C55E]/30 shadow-[0_0_40px_rgba(34,197,94,0.1)]",
          className
        )}
      >
        {/* Cyber Decor */}
        <div className="absolute top-0 left-0 w-32 h-[2px] bg-gradient-to-r from-white/20 to-transparent" />
        <div className="absolute top-0 left-0 w-[2px] h-32 bg-gradient-to-b from-white/20 to-transparent" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between mb-10 relative z-10 gap-6 border-b border-white/[0.05] pb-8">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 relative">
              <span className="text-2xl relative z-10">{allDone ? "🎉" : "🎯"}</span>
              {allDone && <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full animate-pulse" />}
            </div>
            <div>
              <h3 className="text-[18px] font-black text-white font-heading uppercase tracking-widest flex items-center gap-3">
                Nhiệm vụ hàng ngày <span className="text-white/20 font-mono text-[14px] tracking-widest">- QUESTS</span>
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1.5 h-1 px-1 w-24 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn("h-full rounded-full transition-colors duration-500", allDone ? "bg-emerald-400" : "bg-gold-400")}
                    style={{ backgroundColor: allDone ? "#22C55E" : "#E6B84F" }}
                  />
                </div>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] font-mono">
                  {completedCount} / {quests.length} Completed
                </span>
              </div>
            </div>
          </div>

          {allDone && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md font-black uppercase tracking-[0.2em] text-[11px] font-mono flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              MISSION ACCOMPLISHED
            </motion.div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {quests.map((q) => (
            <Link
              key={q.id}
              href={questLinks[q.actionKey] || "/dashboard"}
              className={cn(
                "group/quest flex items-center gap-5 px-6 py-5 rounded-2xl transition-all duration-500 border relative overflow-hidden",
                q.completed
                  ? "bg-emerald-500/[0.03] border-emerald-500/10 opacity-60"
                  : "bg-white/[0.03] border-white/5 hover:border-gold-400/30 hover:bg-white/[0.06] hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              {/* Card Corner Decor */}
              {!q.completed && <div className="absolute top-0 right-0 w-8 h-8 opacity-0 group-hover/quest:opacity-100 transition-opacity">
                <div className="absolute top-0 right-0 w-full h-[1px] bg-gold-400" />
                <div className="absolute top-0 right-0 h-full w-[1px] bg-gold-400" />
              </div>}

              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/quest:border-white/20 transition-all">
                <motion.span
                  className="text-2xl"
                  animate={q.completed ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {q.completed ? "✅" : q.icon}
                </motion.span>
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-[14px] font-black uppercase leading-tight block mb-1 tracking-tight truncate",
                    q.completed ? "text-emerald-500/40 line-through" : "text-white/90 group-hover/quest:text-white transition-colors"
                  )}
                >
                  {q.title}
                </span>
                <p className={cn(
                  "text-[12px] font-semibold opacity-40 truncate",
                  q.completed ? "text-emerald-500/30" : "text-white/40"
                )}>{q.description}</p>
              </div>

              <div className="flex flex-col items-end gap-0.5 min-w-[50px] font-mono">
                <span
                  className={cn(
                    "text-[16px] font-black",
                    q.completed ? "text-emerald-500/30" : "text-gold-400"
                  )}
                >
                  +{q.xp}
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.2em]",
                  q.completed ? "text-emerald-500/20" : "text-gold-400/40"
                )}>EXP</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  );
}
