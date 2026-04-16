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
  title?: string;
  subtitle?: string;
}

export function DailyQuestSection({
  className,
  title = "Nhiệm vụ hàng ngày",
  subtitle,
}: DailyQuestSectionProps) {
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
  const statusText = allDone
    ? "Đã hoàn tất toàn bộ quest hôm nay"
    : subtitle ?? `Còn ${remainingCount} nhiệm vụ cần xử lý`;

  return (
    <>
      <ConfettiCannon active={showConfetti} onDone={() => setShowConfetti(false)} />
      <QuestCompleteToast show={showToast} questName={toastQuest.name} xp={toastQuest.xp} />

      <motion.section
        variants={fadeIn}
        className={cn(
          "group relative mb-6 overflow-hidden rounded-xl border border-[#22C55E]/20 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#22C55E]/40 md:p-8",
          allDone && "border-[#22C55E]/50 shadow-[0_0_32px_rgba(34,197,94,0.18)]",
          className
        )}
      >
        {/* Cyber-Technical Background Elements */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.18),transparent_46%),radial-gradient(circle_at_82%_0%,rgba(0,229,255,0.08),transparent_30%)] opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

        {/* Corner Decor */}
        <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-[#22C55E]/35" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-[#22C55E]/20" />

        <div className="relative z-10 mb-6 border-b border-white/[0.06] pb-6">
          <div className="relative flex flex-col items-start px-6 pt-2">
            <div className="w-full text-left">
              <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px]">
                {title}
              </h3>
              <p className="mt-4 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
                {statusText}
              </p>

              <div className="mt-8 flex max-w-[400px] flex-col items-start gap-4">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="absolute inset-0 opacity-20 bg-white/5" />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn(
                      "relative h-full",
                      allDone ? "bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]" : "bg-[#E6B84F] shadow-[0_0_15px_rgba(230,184,79,0.3)]"
                    )}
                  />
                </div>
                <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/30">
                  {completedCount}/{quests.length} ĐÃ HOÀN TẤT
                </span>
              </div>
            </div>
          </div>
        </div>

        <ul className="grid gap-4">
          {quests.map((quest, index) => (
            <motion.li
              key={quest.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <motion.div
                className={cn(
                  "group/quest relative flex items-start gap-4 rounded-xl border px-4 py-4 transition-all duration-300",
                  quest.completed
                    ? "pointer-events-none border-slate-400/10 bg-slate-400/[0.03] cursor-default opacity-60"
                    : "border-emerald-500/10 bg-emerald-500/[0.02] hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer"
                )}
                animate={!quest.completed ? {
                  boxShadow: [
                    "0 0 15px rgba(16, 185, 129, 0.03)",
                    "0 0 25px rgba(16, 185, 129, 0.12)",
                    "0 0 15px rgba(16, 185, 129, 0.03)"
                  ],
                  borderColor: [
                    "rgba(16, 185, 129, 0.1)",
                    "rgba(16, 185, 129, 0.25)",
                    "rgba(16, 185, 129, 0.1)"
                  ]
                } : {}}
                transition={!quest.completed ? {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}}
                onClick={() => {
                  if (!quest.completed) {
                    window.location.href = questLinks[quest.actionKey] || "/dashboard";
                  }
                }}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-xl transition-colors shadow-[0_0_15px_rgba(0,0,0,0.2)]",
                    quest.completed ? "border-slate-500/20 bg-slate-500/10" : "border-white/10 bg-white/5"
                  )}
                >
                  {quest.completed ? (
                    <div className="relative opacity-60">
                      <span>✅</span>
                    </div>
                  ) : (
                    <span className="opacity-80 group-hover/quest:opacity-100 transition-opacity">{quest.icon}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "font-heading text-[15px] font-black uppercase tracking-wide",
                        quest.completed ? "text-slate-400" : "text-white/90"
                      )}
                    >
                      {quest.title}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider",
                        quest.completed
                          ? "border-slate-500/30 bg-slate-500/10 text-slate-400"
                          : "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
                      )}
                    >
                      +{quest.xp} XP
                    </span>
                  </div>

                  <p className={cn("mt-1.5 text-[13px] leading-relaxed font-semibold", quest.completed ? "text-slate-500" : "text-white/60")}>
                    {quest.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={cn(
                        "font-mono text-[10px] font-black uppercase tracking-wider",
                        quest.completed ? "text-slate-500" : "text-[#22C55E]/70"
                      )}
                    >
                      {quest.completed ? "Trạng thái: Đã xong" : "Hành động: Khám phá"}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-40 group-hover/quest:opacity-100 transition-all duration-300">
                      <div className="h-0.5 w-8 bg-current opacity-20" />
                      <ArrowUpRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-300",
                          quest.completed
                            ? "text-slate-500"
                            : "text-[#22C55E] group-hover/quest:-translate-y-0.5 group-hover/quest:translate-x-0.5"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Decorative dots in quest card */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-10 group-hover/quest:opacity-30 transition-opacity">
                  <span className="h-0.5 w-0.5 rounded-full bg-white transition-all group-hover/quest:bg-[#22C55E]" />
                  <span className="h-0.5 w-0.5 rounded-full bg-white transition-all group-hover/quest:bg-[#22C55E]" />
                  <span className="h-0.5 w-0.5 rounded-full bg-white transition-all group-hover/quest:bg-[#22C55E]" />
                </div>
              </motion.div>
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
