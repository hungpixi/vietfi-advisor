"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { getGamification } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  condition: (state: ReturnType<typeof getGamification>) => boolean;
}

const TIER_STYLES = {
  bronze: {
    border: "border-[#CD7F32]/30",
    bg: "bg-[#CD7F32]/8",
    text: "text-[#CD7F32]",
    ring: "shadow-[0_0_0_1px_rgba(205,127,50,0.25)]",
  },
  silver: {
    border: "border-[#C0C0C0]/30",
    bg: "bg-[#C0C0C0]/8",
    text: "text-[#C0C0C0]",
    ring: "shadow-[0_0_0_1px_rgba(192,192,192,0.25)]",
  },
  gold: {
    border: "border-[#E6B84F]/35",
    bg: "bg-[#E6B84F]/10",
    text: "text-[#E6B84F]",
    ring: "shadow-[0_0_0_1px_rgba(230,184,79,0.3)]",
  },
  diamond: {
    border: "border-[#7DD3FC]/35",
    bg: "bg-[#7DD3FC]/10",
    text: "text-[#7DD3FC]",
    ring: "shadow-[0_0_0_1px_rgba(125,211,252,0.3)]",
  },
};

export const BADGES: Badge[] = [
  { id: "newcomer", name: "Tân Binh", emoji: "🐣", description: "Hoàn thành Quick Setup", tier: "bronze", condition: (state) => state.xp >= 1 },
  { id: "analyst", name: "Nhà Phân Tích", emoji: "📊", description: "Check thị trường 7 lần", tier: "silver", condition: (state) => state.xp >= 35 },
  { id: "saver", name: "Tiết Kiệm Master", emoji: "💰", description: "Ghi 10 chi tiêu", tier: "silver", condition: (state) => state.xp >= 100 },
  { id: "fire", name: "On Fire", emoji: "🔥", description: "Streak 7 ngày liên tiếp", tier: "gold", condition: (state) => state.streak >= 7 },
  { id: "debt_free", name: "Thoát Nợ", emoji: "💎", description: "Trả hết 1 khoản nợ", tier: "diamond", condition: (state) => state.xp >= 200 },
  { id: "champion", name: "Đại Gia", emoji: "🏆", description: "Đạt Level 5 (1000 XP)", tier: "diamond", condition: (state) => state.xp >= 1000 },
  { id: "wise", name: "Thông Thái", emoji: "🧠", description: "Hoàn thành 5 bài học", tier: "gold", condition: (state) => state.xp >= 300 },
];

export function BadgeGrid() {
  const [mounted, setMounted] = useState(false);
  const [earned, setEarned] = useState<Badge[]>([]);
  const [locked, setLocked] = useState<Badge[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const gamification = getGamification();
      setEarned(BADGES.filter((badge) => badge.condition(gamification)));
      setLocked(BADGES.filter((badge) => !badge.condition(gamification)));
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const completion = BADGES.length > 0 ? (earned.length / BADGES.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#E6B84F]" />
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/60">Tiến độ thành tựu</p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
            {earned.length}/{BADGES.length} đã mở khóa
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-[#E6B84F] via-[#F5D37A] to-[#22C55E]"
          />
        </div>
      </div>

      {earned.length > 0 && (
        <section>
          <p className="mb-3 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/45">Đã mở khóa</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((badge, index) => {
              const style = TIER_STYLES[badge.tier];
              return (
                <motion.article
                  key={badge.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "group rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5",
                    style.border,
                    style.bg,
                    style.ring
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="text-3xl transition-transform duration-300 group-hover:scale-110">{badge.emoji}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em]", style.border, style.text)}>
                      {badge.tier}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-black text-white">{badge.name}</h4>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/60">{badge.description}</p>
                </motion.article>
              );
            })}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <p className="mb-3 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/35">Chưa mở khóa</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((badge) => (
              <article
                key={badge.id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.015] px-3 py-3 text-white/45 transition-colors duration-300 hover:text-white/65"
              >
                <div className="relative shrink-0">
                  <span className="text-2xl grayscale">{badge.emoji}</span>
                  <Lock className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-white/55" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black">{badge.name}</p>
                  <p className="truncate text-[11px] text-white/35">{badge.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function BadgeMiniRow() {
  const [earned, setEarned] = useState<Badge[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const gamification = getGamification();
      setEarned(BADGES.filter((badge) => badge.condition(gamification)).slice(0, 5));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (earned.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {earned.map((badge) => (
        <span key={badge.id} className="text-sm" title={badge.name}>
          {badge.emoji}
        </span>
      ))}
      {earned.length < BADGES.length && <span className="ml-0.5 font-mono text-[9px] text-white/20">+{BADGES.length - earned.length}</span>}
    </div>
  );
}
