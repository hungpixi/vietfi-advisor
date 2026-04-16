"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Target } from "lucide-react";
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
      const nowDone = q.filter((item) => item.completed).length;
      const prev = prevDoneRef.current;

      if (nowDone > prev && prev > 0) {
        const justDone = q.find(
          (item) => item.completed && !questsRef.current.find((old) => old.id === item.id && old.completed)
        );

        if (justDone) {
          setToastQuest({ name: justDone.title, xp: justDone.xp });
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2500);
        }
      }

      if (nowDone === q.length && nowDone > 0 && prev < q.length) {
        setShowConfetti(true);
      }

      prevDoneRef.current = nowDone;
      questsRef.current = q;
      setQuests(q);
    };

    check();
    const timer = setInterval(check, 2000);
    return () => clearInterval(timer);
  }, []);

  const completedCount = quests.filter((item) => item.completed).length;
  const allDone = completedCount === quests.length && quests.length > 0;
  const progress = quests.length > 0 ? (completedCount / quests.length) * 100 : 0;
  const remainingCount = Math.max(quests.length - completedCount, 0);
  const remainingXp = quests.filter((item) => !item.completed).reduce((sum, item) => sum + item.xp, 0);

  return (
    <>
      <ConfettiCannon active={showConfetti} onDone={() => setShowConfetti(false)} />
      <QuestCompleteToast show={showToast} questName={toastQuest.name} xp={toastQuest.xp} />

      <motion.section
        variants={fadeIn}
        className={cn(
          "glass-card relative mb-6 overflow-hidden border border-white/10 p-6 transition-all duration-500 md:p-8",
          allDone && "border-[#22C55E]/35 shadow-[0_0_28px_rgba(34,197,94,0.12)]",
          className
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.05] to-transparent" />
        <div className="pointer-events-none absolute -top-32 -right-16 h-64 w-64 rounded-full bg-[#E6B84F]/10 blur-[90px]" />

        <div className="relative z-10 mb-8 border-b border-white/[0.06] pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5">
                  <Target className={cn("h-5 w-5", allDone ? "text-emerald-400" : "text-[#E6B84F]")} />
                </div>
                <div>
                  <h3 className="font-heading text-[18px] font-black uppercase tracking-widest text-white">
                    Nhiệm vụ hàng ngày
                  </h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
                    {allDone ? "Đã hoàn tất toàn bộ quest hôm nay" : `Còn ${remainingCount} nhiệm vụ cần xử lý`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-2 w-44 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn("h-full rounded-full", allDone ? "bg-emerald-400" : "bg-[#E6B84F]")}
                  />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
                  {completedCount}/{quests.length} hoàn tất
                </span>
              </div>
            </div>

            {allDone ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mission accomplished
              </motion.div>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
                +{remainingXp} XP còn lại
              </span>
            )}
          </div>
        </div>

        <ul className="grid gap-3 md:grid-cols-2">
          {quests.map((quest, index) => (
            <motion.li
              key={quest.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link
                href={questLinks[quest.actionKey] || "/dashboard"}
                className={cn(
                  "group/quest flex items-start gap-4 rounded-2xl border px-4 py-4 transition-all duration-300",
                  quest.completed
                    ? "border-emerald-400/20 bg-emerald-400/[0.06]"
                    : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-[#E6B84F]/35 hover:bg-white/[0.06]"
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl transition-colors",
                    quest.completed ? "border-emerald-300/40 bg-emerald-400/10" : "border-white/15 bg-white/5"
                  )}
                >
                  {quest.completed ? "✅" : quest.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-[14px] font-black tracking-tight",
                        quest.completed ? "text-emerald-200/70" : "text-white/90"
                      )}
                    >
                      {quest.title}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em]",
                        quest.completed
                          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-300"
                          : "border-[#E6B84F]/30 bg-[#E6B84F]/10 text-[#E6B84F]"
                      )}
                    >
                      +{quest.xp} XP
                    </span>
                  </div>

                  <p className={cn("mt-1 text-[12px] leading-relaxed", quest.completed ? "text-emerald-100/45" : "text-white/45")}>
                    {quest.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={cn(
                        "font-mono text-[10px] uppercase tracking-[0.14em]",
                        quest.completed ? "text-emerald-300/70" : "text-white/35"
                      )}
                    >
                      {quest.completed ? "Đã hoàn tất" : "Mở nhiệm vụ"}
                    </span>
                    <ArrowUpRight
                      className={cn(
                        "h-4 w-4 transition-transform duration-300",
                        quest.completed
                          ? "text-emerald-300/70"
                          : "text-white/35 group-hover/quest:-translate-y-0.5 group-hover/quest:translate-x-0.5 group-hover/quest:text-[#E6B84F]"
                      )}
                    />
                  </div>
                </div>
              </Link>
            </motion.li>
          ))}

          {quests.length === 0 && (
            <li className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/45 md:col-span-2">
              Đang tải nhiệm vụ hôm nay...
            </li>
          )}
        </ul>
      </motion.section>
    </>
  );
}
