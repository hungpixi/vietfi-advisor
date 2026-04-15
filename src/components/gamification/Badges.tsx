"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { getGamification } from "@/lib/gamification";

/* ─── Badge Definitions ─── */
export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  condition: (state: ReturnType<typeof getGamification>) => boolean;
}

const TIER_STYLES = {
  bronze: { border: "border-[#CD7F32]/30", bg: "bg-[#CD7F32]/5", glow: "", text: "text-[#CD7F32]" },
  silver: { border: "border-[#C0C0C0]/30", bg: "bg-[#C0C0C0]/5", glow: "", text: "text-[#C0C0C0]" },
  gold: { border: "border-[#E6B84F]/30", bg: "bg-[#E6B84F]/8", glow: "shadow-[0_0_15px_rgba(230,184,79,0.15)]", text: "text-[#E6B84F]" },
  diamond: { border: "border-[#A855F7]/30", bg: "bg-[#A855F7]/5", glow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]", text: "text-[#A855F7]" },
};

export const BADGES: Badge[] = [
  { id: "newcomer", name: "Tân Binh", emoji: "🐣", description: "Hoàn thành Quick Setup", tier: "bronze", condition: (s) => s.xp >= 1 },
  { id: "analyst", name: "Nhà Phân Tích", emoji: "📊", description: "Check thị trường 7 lần", tier: "silver", condition: (s) => s.xp >= 35 },
  { id: "saver", name: "Tiết Kiệm Master", emoji: "💰", description: "Ghi 10 chi tiêu", tier: "silver", condition: (s) => s.xp >= 100 },
  { id: "fire", name: "On Fire", emoji: "🔥", description: "Streak 7 ngày liên tiếp", tier: "gold", condition: (s) => s.streak >= 7 },
  { id: "debt_free", name: "Thoát Nợ", emoji: "💎", description: "Trả hết 1 khoản nợ", tier: "diamond", condition: (s) => s.xp >= 200 },
  { id: "champion", name: "Đại Gia", emoji: "🏆", description: "Đạt Level 5 (1000 XP)", tier: "diamond", condition: (s) => s.xp >= 1000 },
  { id: "wise", name: "Thông Thái", emoji: "🧠", description: "Hoàn thành 5 bài học", tier: "gold", condition: (s) => s.xp >= 300 },
];

/* ─── Badge Grid Component (SSR-safe) ─── */
export function BadgeGrid() {
  const [mounted, setMounted] = useState(false);
  const [earned, setEarned] = useState<Badge[]>([]);
  const [locked, setLocked] = useState<Badge[]>([]);

  useEffect(() => {
    const gam = getGamification();
    setEarned(BADGES.filter((b) => b.condition(gam)));
    setLocked(BADGES.filter((b) => !b.condition(gam)));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {earned.length > 0 && (
        <div>
          <p className="text-[18px] font-black font-heading uppercase tracking-[0.3em] text-white/30 mb-6">
            ĐÃ MỞ KHOÁ ({earned.length}/{BADGES.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {earned.map((badge, i) => {
              const style = TIER_STYLES[badge.tier];
              return (
                <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className={`flex flex-col items-center gap-4 p-8 rounded-[32px] border ${style.border} ${style.bg} ${style.glow} hover:scale-105 transition-transform cursor-default group`}>
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-500">{badge.emoji}</span>
                  <span className={`text-[16px] font-black uppercase tracking-widest ${style.text}`}>{badge.name}</span>
                  <span className="text-[14px] text-white/30 text-center leading-relaxed font-black uppercase opacity-60">{badge.description}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      {locked.length > 0 && (
        <div>
          <p className="text-[18px] font-black font-heading uppercase tracking-[0.3em] text-white/30 mb-6">CHƯA MỞ KHOÁ</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {locked.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center gap-4 p-8 rounded-[32px] border border-white/[0.08] bg-white/[0.02] opacity-30 group grayscale hover:grayscale-0 transition-all duration-500">
                <div className="relative">
                  <span className="text-5xl">{badge.emoji}</span>
                  <Lock className="absolute -bottom-2 -right-2 w-6 h-6 text-white/60 drop-shadow-[0_0_8px_black]" />
                </div>
                <span className="text-[16px] font-black text-white/40 uppercase tracking-widest">{badge.name}</span>
                <span className="text-[14px] text-white/20 text-center leading-relaxed font-black uppercase">{badge.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Badge Mini Row (SSR-safe) ─── */
export function BadgeMiniRow() {
  const [earned, setEarned] = useState<Badge[]>([]);
  useEffect(() => {
    const gam = getGamification();
    setEarned(BADGES.filter((b) => b.condition(gam)).slice(0, 5));
  }, []);
  if (earned.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {earned.map((b) => (<span key={b.id} className="text-sm" title={b.name}>{b.emoji}</span>))}
      {earned.length < BADGES.length && (<span className="text-[9px] text-white/15 font-mono ml-0.5">+{BADGES.length - earned.length}</span>)}
    </div>
  );
}
