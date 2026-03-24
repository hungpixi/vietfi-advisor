"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Flame, Zap, Target, Shield } from "lucide-react";
import { getGamification, getLevelProgress } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { getLessonsDone, getStreakFreeze, setStreakFreeze } from "@/lib/storage";
import type { StreakFreezeState } from "@/lib/storage";

/* ─── Weekly Stats ─── */
interface WeeklyStats {
  xpEarned: number;
  questsCompleted: number;
  lessonsCompleted: number;
  longestStreak: number;
  actionsThisWeek: string[];
  daysActive: number;
}

function getWeeklyStats(): WeeklyStats {
  if (typeof window === "undefined") return { xpEarned: 0, questsCompleted: 0, lessonsCompleted: 0, longestStreak: 0, actionsThisWeek: [], daysActive: 0 };

  const gam = getGamification();
  const lessonsDone = getLessonsDone();

  // Simple stats from current state
  return {
    xpEarned: gam.xp,
    questsCompleted: gam.actions.length,
    lessonsCompleted: lessonsDone.length,
    longestStreak: gam.streak,
    actionsThisWeek: gam.actions,
    daysActive: Math.min(7, gam.streak),
  };
}

/* ─── Streak Freeze ─── */
function getISOWeek(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return `${d.getFullYear()}-W${Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1}`;
}

export function getStreakFreezeState(): StreakFreezeState {
  if (typeof window === "undefined") return { freezesAvailable: 1, lastFreeWeek: "", usedThisWeek: false };
  const saved = getStreakFreeze();
  const currentWeek = getISOWeek();
  if (saved) {
    // Auto-grant 1 free freeze per week
    if (saved.lastFreeWeek !== currentWeek) {
      const updated: StreakFreezeState = {
        freezesAvailable: Math.min(saved.freezesAvailable + 1, 3),
        lastFreeWeek: currentWeek,
        usedThisWeek: false,
      };
      setStreakFreeze(updated);
      return updated;
    }
    return saved;
  }
  const initial: StreakFreezeState = { freezesAvailable: 1, lastFreeWeek: currentWeek, usedThisWeek: false };
  setStreakFreeze(initial);
  return initial;
}

export function useStreakFreeze(): boolean {
  const state = getStreakFreezeState();
  if (state.freezesAvailable <= 0) return false;
  setStreakFreeze({ ...state, freezesAvailable: state.freezesAvailable - 1, usedThisWeek: true });
  return true;
}

export function earnStreakFreeze(): boolean {
  const gam = getGamification();
  if (gam.xp < 200) return false; // Need 200 XP to earn
  const state = getStreakFreezeState();
  if (state.freezesAvailable >= 3) return false; // Max 3
  setStreakFreeze({ ...state, freezesAvailable: state.freezesAvailable + 1 });
  return true;
}

/* ─── Weekly Report Modal ─── */
export function WeeklyReportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [freezeState, setFreezeState] = useState<StreakFreezeState | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStats(getWeeklyStats());
      setFreezeState(getStreakFreezeState());
    }
  }, [isOpen]);

  if (!stats || !freezeState) return null;

  const gam = getGamification();
  const { current, next, progress } = getLevelProgress(gam.xp);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#12131A] rounded-2xl border border-white/[0.06] overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 text-center bg-gradient-to-b from-[#E6B84F]/5 to-transparent">
              <button onClick={onClose} className="absolute top-4 right-4 text-white/20 hover:text-white/60">
                <X className="w-5 h-5" />
              </button>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 mb-2">WEEKLY REPORT</p>
              <h2 className="text-xl font-black text-white mb-1">📊 Tuần của bạn</h2>
              <p className="text-xs text-white/30">Tổng kết hoạt động tài chính</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-2">
              <StatCard icon={<Zap className="w-4 h-4 text-[#E6B84F]" />} label="XP kiếm được" value={`${stats.xpEarned}`} color="#E6B84F" />
              <StatCard icon={<Flame className="w-4 h-4 text-orange-400" />} label="Streak dài nhất" value={`${stats.longestStreak} ngày`} color="#FF6B35" />
              <StatCard icon={<Target className="w-4 h-4 text-[#22C55E]" />} label="Quests done" value={`${stats.questsCompleted}`} color="#22C55E" />
              <StatCard icon={<TrendingUp className="w-4 h-4 text-[#A855F7]" />} label="Bài học xong" value={`${stats.lessonsCompleted}/5`} color="#A855F7" />
            </div>

            {/* Level Progress */}
            <div className="mx-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">Level hiện tại</span>
                <span className="text-sm font-bold text-white">{current.emoji} {current.name}</span>
              </div>
              <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: "linear-gradient(90deg, #E6B84F, #FF6B35)" }}
                />
              </div>
              {next && (
                <p className="text-[10px] text-white/20 mt-1 text-right">
                  {next.emoji} {next.name} — còn {next.min - gam.xp} XP
                </p>
              )}
            </div>

            {/* Streak Freeze */}
            <div className="mx-4 mb-4 p-3 rounded-xl bg-[#3B82F6]/5 border border-[#3B82F6]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#3B82F6]" />
                  <div>
                    <p className="text-xs font-bold text-white/80">Streak Freeze</p>
                    <p className="text-[10px] text-white/20">Bảo vệ streak khi quên vào app</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center text-[10px]",
                        i < freezeState.freezesAvailable
                          ? "bg-[#3B82F6]/20 text-[#3B82F6]"
                          : "bg-white/[0.03] text-white/10"
                      )}
                    >
                      🛡️
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-white/15 mt-1.5">+1 free mỗi tuần • Max 3 • Earn thêm bằng XP</p>
            </div>

            {/* CTA */}
            <div className="px-4 pb-4">
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm font-bold text-[#E6B84F] bg-[#E6B84F]/10 rounded-xl hover:bg-[#E6B84F]/20 transition"
              >
                Tiếp tục chinh phục! 🦜
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Stat Card ─── */
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
    >
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] text-white/30">{label}</span></div>
      <p className="text-lg font-black" style={{ color }}>{value}</p>
    </motion.div>
  );
}
