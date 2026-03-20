"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Flame, TrendingUp, ShieldAlert, ArrowUp, ArrowDown, Info } from "lucide-react";
import { getGamification } from "@/lib/gamification";

/* ─── Mock Data Generators ─── */
const BOT_NAMES = [
  "Hải Quay Xe", "Vẹt Đu Đỉnh", "Trader Mõm", "Cá Mập Con", "Cá Voi Lên Cạn",
  "Hold To Die", "Bắt Đáy Cụt Tay", "Bò Lạc Lối", "Gấu Ngủ Đông", "Thích Tiết Kiệm",
  "Chúa Tể Lãi Kép", "Nữ Hoàng Đu Đỉnh", "Đỗ Nghèo Khỉ", "Bàn Tay Kim Cương"
];

const AVATAR_COLORS = [
  "from-pink-500 to-rose-500", "from-purple-500 to-indigo-500", 
  "from-blue-500 to-cyan-500", "from-emerald-500 to-teal-500", 
  "from-orange-500 to-amber-500", "from-red-500 to-orange-500"
];

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
    const gam = getGamification();
    setUserXP(gam.xp);
    
    // We want the bots to have XP relative to the user's CURRENT xp, 
    // but we don't want them jumping around every time user earns 5 XP.
    // Solution: Save bot offsets to localStorage once per week.
    const currentWeekInfo = getWeekIdentifier();
    const storageKey = `vietfi_leaderboard_bots_${currentWeekInfo}`;
    
    let botOffsets: number[] = [];
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      botOffsets = JSON.parse(saved);
    } else {
      // Generate offsets: some above, some below
      botOffsets = Array.from({ length: 14 }).map((_, i) => {
        // Create a spread from +200 to -100 XP relative to user's starting point
        const offset = Math.floor(seededRandom(i + 1) * 300) - 100;
        return offset;
      });
      // Sort them so they are nicely distributed
      botOffsets.sort((a, b) => b - a);
      localStorage.setItem(storageKey, JSON.stringify(botOffsets));
    }

    // Now construct the full leaderboard
    // The user's baseline XP when they first opened the leaderboard this week
    const baselineKey = `vietfi_leaderboard_baseline_${currentWeekInfo}`;
    let baselineXP = parseInt(localStorage.getItem(baselineKey) || "0", 10);
    if (!baselineXP) {
      baselineXP = Math.max(0, gam.xp - 20); // assume user just started climbing
      localStorage.setItem(baselineKey, baselineXP.toString());
    }

    const bots: LeaderboardEntry[] = botOffsets.map((offset, i) => {
      // Bot's XP is baseline + offset + a tiny bit of random growth throughout the week
      const currentDayOfWeek = new Date().getDay();
      const randomGrowth = Math.floor(seededRandom(offset) * 10 * currentDayOfWeek);
      const botXP = Math.max(0, baselineXP + offset + randomGrowth);
      
      return {
        id: `bot-${i}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        xp: botXP,
        isCurrentUser: false,
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        avatarEmoji: ["🚀", "💎", "📉", "📈", "🐂", "🐻", "💰", "💸"][i % 8],
        trending: seededRandom(botXP) > 0.5 ? "up" : "down"
      };
    });

    const userEntry: LeaderboardEntry = {
      id: "current-user",
      name: "Bạn",
      xp: gam.xp,
      isCurrentUser: true,
      avatarColor: "from-primary to-yellow-500",
      avatarEmoji: "😎",
      trending: "up"
    };

    const combined = [...bots, userEntry].sort((a, b) => b.xp - a.xp);
    setEntries(combined);
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  const userRank = entries.findIndex(e => e.isCurrentUser) + 1;
  const isPromotionZone = userRank <= 3;
  const isDemotionZone = userRank >= entries.length - 2;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      {/* ─── Header Section ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#1A1B23]/50 border border-white/[0.04] p-6 sm:p-8 shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <Trophy className="w-48 h-48 text-[#CD7F32] mix-blend-screen animate-pulse" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-[#CD7F32]/20 text-[#CD7F32] border border-[#CD7F32]/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Medal className="w-3 h-3" />
                Giải Đồng Tân Binh
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                Kết thúc sau 3 ngày
              </span>
            </div>
            
            <h1 className="text-3xl font-bold text-white tracking-tight">Bảng Xếp Hạng</h1>
            <p className="text-white/60 max-w-md text-sm leading-relaxed">
              Cạnh tranh cùng 14 nhà đầu tư khác. Top 3 sẽ được thăng hạng lên Giải Bạc 🥈. Hoàn thành Nhiệm Vụ Hàng Ngày và Bài Học để kiếm thêm XP!
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md min-w-[120px]">
            <span className="text-xs text-white/50 mb-1 uppercase tracking-wider font-mono">Hạng của bạn</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">
                #{userRank}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Leaderboard List ─── */}
      <div className="bg-[#1A1B23]/50 border border-white/[0.04] rounded-3xl overflow-hidden relative">
        <div className="absolute inset-x-0 top-[210px] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-[140px] h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <div className="divide-y divide-white/[0.04]">
          <AnimatePresence>
            {entries.map((entry, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const isBottom3 = rank >= entries.length - 2;
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    flex items-center gap-4 p-4 sm:p-5 relative transition-colors duration-300
                    ${entry.isCurrentUser ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-white/[0.02]"}
                    ${isTop3 && !entry.isCurrentUser ? "bg-emerald-500/[0.02]" : ""}
                    ${isBottom3 && !entry.isCurrentUser ? "bg-red-500/[0.02]" : ""}
                  `}
                >
                  {/* Rank Indicator */}
                  <div className="w-8 flex justify-center shrink-0">
                    {rank === 1 ? <span className="text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">🥇</span> :
                     rank === 2 ? <span className="text-2xl drop-shadow-[0_0_10px_rgba(156,163,175,0.5)]">🥈</span> :
                     rank === 3 ? <span className="text-2xl drop-shadow-[0_0_10px_rgba(180,83,9,0.5)]">🥉</span> :
                     <span className={`text-lg font-bold font-mono ${entry.isCurrentUser ? "text-primary" : "text-white/40"}`}>{rank}</span>}
                  </div>

                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 bg-gradient-to-br ${entry.avatarColor} relative shadow-lg`}>
                    {entry.avatarEmoji}
                    {entry.isCurrentUser && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-[#1A1B23]" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold truncate ${entry.isCurrentUser ? "text-primary" : "text-white/90"}`}>
                      {entry.name}
                    </h3>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`font-black tracking-tight font-mono ${entry.isCurrentUser ? "text-primary text-lg" : "text-white/80"}`}>
                      {entry.xp} XP
                    </span>
                    {!entry.isCurrentUser && (
                      <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                        {entry.trending === "up" ? <ArrowUp className="w-3 h-3 text-emerald-500/50" /> : <ArrowDown className="w-3 h-3 text-red-500/50" />}
                        Hôm nay
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Status Footer ─── */}
      <div className={`
        p-4 rounded-2xl flex items-start gap-3 border
        ${isPromotionZone ? "bg-emerald-500/10 border-emerald-500/20" : 
          isDemotionZone ? "bg-red-500/10 border-red-500/20" : 
          "bg-white/5 border-white/10"}
      `}>
        {isPromotionZone ? <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" /> : 
         isDemotionZone ? <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" /> : 
         <Info className="w-5 h-5 text-white/40 shrink-0" />}
        <div>
          <h4 className={`text-sm font-bold ${
            isPromotionZone ? "text-emerald-500" : 
            isDemotionZone ? "text-red-500" : 
            "text-white/80"
          }`}>
            {isPromotionZone ? "Bạn đang ở khu vực Thăng Hạng!" : 
             isDemotionZone ? "Cảnh báo: Khu vực Rớt Hạng!" : 
             "Bạn đang ở khu vực an toàn."}
          </h4>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">
            {isPromotionZone ? "Giữ vững vị trí trong Top 3 để được lên Giải Bạc khi tuần này kết thúc nha!" : 
             isDemotionZone ? "Hãy học một bài học hoặc hoàn thành nhiệm vụ để vượt qua nhóm an toàn!" : 
             "Làm thêm nhiệm vụ để lọt vào Top 3 Thăng Hạng nhé!"}
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper: Get identifier for the current week (e.g. "2026-W12")
function getWeekIdentifier() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}
