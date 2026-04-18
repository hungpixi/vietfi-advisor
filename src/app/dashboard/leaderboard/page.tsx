"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Flame, TrendingUp, TrendingDown, ShieldAlert, ArrowUp, ArrowDown, Info, ChevronRight, Target } from "lucide-react";
import { getGamification } from "@/lib/gamification";
import { getLeaderboardBots, setLeaderboardBots, getLeaderboardBaseline, setLeaderboardBaseline } from "@/lib/storage";
import { cn } from "@/lib/utils";

/* ─── Mock Data Generators ─── */
const BOT_NAMES = [
  "Hải Quay Xe", "Vẹt Đu Đỉnh", "Trader Mõm", "Cá Mập Con", "Cá Voi Lên Cạn",
  "Hold To Die", "Bắt Đáy Cụt Tay", "Bò Lạc Lối", "Gấu Ngủ Đông", "Thích Tiết Kiệm",
  "Chúa Tể Lãi Kép", "Nữ Hoàng Đu Đỉnh", "Đỗ Nghèo Khỉ", "Bàn Tay Kim Cương"
];

const AVATAR_COLORS = [
  "from-pink-500/20 to-rose-500/20", "from-purple-500/20 to-indigo-500/20",
  "from-blue-500/20 to-cyan-500/20", "from-emerald-500/20 to-teal-500/20",
  "from-orange-500/20 to-amber-500/20", "from-red-500/20 to-orange-500/20"
];

const SEED_EMOJI = ["🚀", "💎", "📉", "📈", "🐂", "🐻", "💰", "💸"];

// Helper to deterministically generate a seeded random number
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  isCurrentUser: boolean;
  avatarColor: string;
  avatarEmoji: string;
  trending: "up" | "down" | "flat";
}

export default function LeaderboardPage() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userXP, setUserXP] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const gam = getGamification();
      setUserXP(gam.xp);

      const currentWeekInfo = getWeekIdentifier();
      let botOffsets: number[] = getLeaderboardBots(currentWeekInfo);

      if (botOffsets.length === 0) {
        botOffsets = Array.from({ length: 14 }).map((_, i) => {
          const offset = Math.floor(seededRandom(i + 1) * 300) - 100;
          return offset;
        });
        botOffsets.sort((a, b) => b - a);
        setLeaderboardBots(currentWeekInfo, botOffsets);
      }

      let baselineXP = getLeaderboardBaseline(currentWeekInfo);
      if (!baselineXP) {
        baselineXP = Math.max(0, gam.xp - 20);
        setLeaderboardBaseline(currentWeekInfo, baselineXP);
      }

      const bots: LeaderboardEntry[] = botOffsets.map((offset, i) => {
        const currentDayOfWeek = new Date().getDay();
        const randomGrowth = Math.floor(seededRandom(offset) * 10 * currentDayOfWeek);
        const botXP = Math.max(0, baselineXP + offset + randomGrowth);

        return {
          id: `bot-${i}`,
          name: BOT_NAMES[i % BOT_NAMES.length],
          xp: botXP,
          isCurrentUser: false,
          avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
          avatarEmoji: SEED_EMOJI[i % SEED_EMOJI.length],
          trending: seededRandom(botXP) > 0.5 ? "up" : "down",
        };
      });

      const userEntry: LeaderboardEntry = {
        id: "current-user",
        name: "Bạn",
        xp: gam.xp,
        isCurrentUser: true,
        avatarColor: "from-[#22C55E]/20 to-[#22C55E]/10",
        avatarEmoji: "😎",
        trending: "up",
      };

      const combined = [...bots, userEntry].sort((a, b) => b.xp - a.xp);
      setEntries(combined);
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#22C55E]/30 border-t-[#22C55E] animate-spin" />
      </div>
    );
  }

  const userRank = entries.findIndex(e => e.isCurrentUser) + 1;
  const isPromotionZone = userRank <= 3;
  const isDemotionZone = userRank >= entries.length - 2;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 px-4 sm:px-0">
      {/* ─── Header Section ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#22C55E]/30 sm:p-8"
      >
        {/* Cyber-Technical Background Elements */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.18),transparent_46%),radial-gradient(circle_at_82%_0%,rgba(0,229,255,0.08),transparent_30%)] opacity-80" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

        {/* Corner Decorators */}
        <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-[#22C55E]/35" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-[#22C55E]/20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-sm bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Target className="w-3 h-3" />
                GIẢI ĐỒNG TÂN BINH
              </span>
              <span className="px-3 py-1 rounded-sm bg-white/5 border border-white/10 text-white/75 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                KẾT THÚC: 03 NGÀY
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="font-heading text-[32px] sm:text-[40px] font-black uppercase leading-none tracking-tight text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)]">
                BẢNG XẾP HẠNG
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 bg-[#22C55E]/50" />
                <p className="font-mono text-[12px] font-black uppercase tracking-widest text-[#22C55E]">
                  THIẾT LẬP KỶ LỤC ĐẦU TƯ
                </p>
              </div>
            </div>

            <p className="text-white/85 max-w-md text-[14px] leading-relaxed font-semibold italic">
              "Top 3 sẽ được thăng hạng lên Giải Bạc. Hoàn thành Nhiệm Vụ và Bài Học để nạp thêm XP ngay!"
            </p>
          </div>

          <div className="relative shrink-0 flex flex-col items-center justify-center p-6 rounded-xl bg-black/40 border border-[#22C55E]/20 backdrop-blur-md min-w-[140px] group/rank shadow-[0_0_30px_rgba(34,197,94,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/10 to-transparent opacity-0 group-hover/rank:opacity-100 transition-opacity" />
            <div className="pointer-events-none absolute -right-2 -top-2 h-4 w-4 border-r border-t border-[#22C55E]/40" />
            <div className="pointer-events-none absolute -left-2 -bottom-2 h-4 w-4 border-b border-l border-[#22C55E]/20" />

            <span className="relative z-10 font-mono text-[11px] text-white/70 mb-2 uppercase tracking-[0.3em] font-black">Vị trí của bạn</span>
            <div className="relative z-10 flex items-baseline gap-1">
              <span className="font-heading text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                #{userRank}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Leaderboard List ─── */}
      <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#08110f] shadow-[0_32px_96px_rgba(0,0,0,0.45)] transition-all duration-500 hover:border-white/15">
        {/* Background Elements for List */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.45)_0%,rgba(7,11,20,0.6)_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:30px_30px]" />

        {/* Corner Decorators for the List */}
        <div className="pointer-events-none absolute right-4 top-4 h-6 w-6 border-r border-t border-white/10" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-6 w-6 border-b border-l border-white/5" />

        <div className="relative z-10 divide-y divide-white/[0.04]">
          {/* List Header */}
          <div className="flex items-center gap-4 px-6 py-4 bg-white/[0.03] border-b border-white/[0.06]">
            <span className="w-10 font-mono text-[11px] font-black text-white/50 uppercase tracking-[0.2em] text-center">HẠNG</span>
            <span className="flex-1 font-mono text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">NHÀ ĐẦU TƯ</span>
            <span className="w-24 text-right font-mono text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">TÍCH LŨY (XP)</span>
          </div>

          <AnimatePresence>
            {entries.map((entry, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const isBottom3 = rank >= entries.length - 2;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "group/row flex items-center gap-4 p-4 sm:px-6 sm:py-5 relative transition-all duration-300",
                    entry.isCurrentUser
                      ? "bg-[#22C55E]/[0.08] shadow-[inset_0_0_40px_rgba(34,197,94,0.05)] z-20"
                      : "hover:bg-[#22C55E]/[0.02]",
                    isTop3 && !entry.isCurrentUser ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-emerald-500/20" : "",
                    isBottom3 && !entry.isCurrentUser ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-red-500/20" : ""
                  )}
                >
                  <div className="absolute inset-0 opacity-0 group-hover/row:opacity-100 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.04),transparent_70%)] transition-opacity pointer-events-none" />

                  {/* Rank Indicator */}
                  <div className="w-10 flex justify-center shrink-0">
                    {rank === 1 ? <div className="text-2xl drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse">🥇</div> :
                      rank === 2 ? <div className="text-2xl drop-shadow-[0_0_15px_rgba(156,163,175,0.6)]">🥈</div> :
                        rank === 3 ? <div className="text-2xl drop-shadow-[0_0_15px_rgba(180,83,9,0.6)]">🥉</div> :
                          <span className={cn(
                            "font-heading text-lg font-black tracking-tighter transition-colors",
                            entry.isCurrentUser ? "text-[#22C55E]" : "text-white/25 group-hover/row:text-white/60"
                          )}>
                            {rank.toString().padStart(2, '0')}
                          </span>}
                  </div>

                  {/* Avatar Container with Glow */}
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0 border transition-all duration-500 bg-gradient-to-br relative overflow-hidden",
                      entry.isCurrentUser ? "border-[#22C55E]/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "border-white/5 group-hover/row:border-white/20",
                      entry.avatarColor
                    )}>
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4),transparent_70%)]" />
                      <span className="relative z-10 group-hover/row:scale-110 transition-transform duration-500">{entry.avatarEmoji}</span>
                      {entry.isCurrentUser && (
                        <div className="absolute inset-0 bg-[#22C55E]/10 animate-pulse" />
                      )}
                    </div>
                    {/* Status pulse for active users */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#08110f] flex items-center justify-center border border-white/10 z-20">
                      <div className={cn("w-1.5 h-1.5 rounded-full", entry.trending === "up" ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]")} />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-heading text-[18px] font-black uppercase tracking-wide truncate transition-all duration-300",
                      entry.isCurrentUser ? "text-white drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]" : "text-white/90 group-hover/row:text-white group-hover/row:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                    )}>
                      {entry.name}
                      {entry.isCurrentUser && <span className="ml-2 text-[10px] text-[#22C55E] border border-[#22C55E]/30 px-1.5 py-0.5 rounded tracking-widest font-black animate-pulse">BẠN</span>}
                    </h3>
                  </div>

                  {/* Score with Intensity */}
                  <div className="flex flex-col items-end shrink-0 w-24">
                    <span className={cn(
                      "font-heading leading-none font-black tracking-tighter transition-all",
                      entry.isCurrentUser
                        ? "text-[#22C55E] text-[28px] drop-shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                        : "text-white/90 text-[20px] group-hover/row:text-[#22C55E] group-hover/row:drop-shadow-[0_0_8px_rgba(34,197,94,0.2)]"
                    )}>
                      {entry.xp.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-mono text-[10px] font-black text-white/30 uppercase tracking-widest">ĐƠN VỊ: XP</span>
                      {!entry.isCurrentUser && (
                        <div className="flex items-center">
                          {entry.trending === "up"
                            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500/60" />
                            : <TrendingDown className="w-3.5 h-3.5 text-red-500/60" />}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Indicator (Only for hover) */}
                  <div className="absolute right-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-[#22C55E]/40" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Status Footer ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={cn(
          "group relative overflow-hidden p-6 rounded-xl border transition-all duration-500 shadow-[0_24px_64px_rgba(0,0,0,0.2)]",
          isPromotionZone ? "bg-emerald-500/[0.04] border-emerald-500/30 hover:border-emerald-500/50" :
            isDemotionZone ? "bg-red-500/[0.04] border-red-500/30 hover:border-red-500/50" :
              "bg-white/[0.02] border-white/10 hover:border-white/20"
        )}
      >
        <div className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-700",
          isPromotionZone ? "bg-[radial-gradient(circle_at_0%_0%,rgba(34,197,94,0.12),transparent_40%)]" :
            isDemotionZone ? "bg-[radial-gradient(circle_at_0%_0%,rgba(239,68,68,0.12),transparent_40%)]" :
              "bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.03),transparent_40%)]"
        )} />

        {/* Corner Decorators for Status Footer */}
        <div className={cn("pointer-events-none absolute right-4 top-4 h-4 w-4 border-r border-t", isPromotionZone ? "border-emerald-500/30" : isDemotionZone ? "border-red-500/30" : "border-white/10")} />
        <div className={cn("pointer-events-none absolute bottom-4 left-4 h-4 w-4 border-b border-l", isPromotionZone ? "border-emerald-500/20" : isDemotionZone ? "border-red-500/20" : "border-white/5")} />

        <div className="relative z-10 flex items-start gap-5">
          <div className={cn(
            "p-3.5 rounded-xl border transition-transform duration-500 group-hover:scale-110",
            isPromotionZone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]" :
              isDemotionZone ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]" :
                "bg-white/5 border-white/10 text-white/70"
          )}>
            {isPromotionZone ? <Trophy className="w-6 h-6" /> :
              isDemotionZone ? <ShieldAlert className="w-6 h-6" /> :
                <Info className="w-6 h-6" />}
          </div>

          <div className="flex-1 space-y-2">
            <h4 className={cn(
              "font-heading text-[15px] font-black uppercase tracking-widest",
              isPromotionZone ? "text-emerald-500" :
                isDemotionZone ? "text-red-500" :
                  "text-white/90"
            )}>
              {isPromotionZone ? "TUYỆT VỜI! SẮP THĂNG HẠNG RỒI" :
                isDemotionZone ? "CẢNH BÁO: CẦN HÀNH ĐỘNG NGAY" :
                  "BẠN ĐANG Ở VÙNG AN TOÀN"}
            </h4>
            <p className="font-mono text-[11px] font-black text-white/70 leading-relaxed uppercase tracking-widest">
              {isPromotionZone ? "Giữ vững vị trí trong Top 3 để tiến vào Giải Bạc vào cuối tuần này nhé. Cố lên!" :
                isDemotionZone ? "Bạn đang ở vùng nguy hiểm. Hãy hoàn thành thêm bài học để lấy lại vị trí an toàn!" :
                  "Chỉ còn một chút nữa là lọt vào Top 3 rồi. Làm thêm nhiệm vụ để tăng tốc nha!"}
            </p>
          </div>

          <div className="hidden sm:block">
            <div className="flex flex-col items-end gap-1 font-mono text-[10px] text-white/40">
              <span className="font-black tracking-widest">HỆ THỐNG: HOẠT ĐỘNG</span>
              <span className="font-black tracking-widest">THỜI GIAN: 100%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Helper: Get identifier for the current week (e.g. "2026-W12")
function getWeekIdentifier() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}
