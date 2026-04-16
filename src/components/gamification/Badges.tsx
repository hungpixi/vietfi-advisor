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

interface BadgeGridProps {
  title?: string;
  showProgress?: boolean;
  compact?: boolean;
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

export function BadgeGrid({
  title = "Thành tựu đạt được",
  showProgress = true,
  compact = false,
}: BadgeGridProps) {
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
      {showProgress ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#E6B84F]" />
              <p className="font-heading text-[15px] font-black uppercase tracking-wide text-[#E6B84F]">{title}</p>
            </div>
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#E6B84F]/70">
              {earned.length}/{BADGES.length} ĐÃ MỞ KHÓA
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
      ) : null}

      {!showProgress ? (
        <div className="relative z-10 mb-6 border-b border-white/[0.06] pb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between px-2 sm:px-6">
          <div className="relative flex flex-col items-start pt-2">
            <div className="w-full text-left">
              <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px] flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-[#E6B84F]" />
                {title}
              </h3>
              <p className="mt-4 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#E6B84F]/60">
                Huy hiệu mở khóa khi bạn đều tay hơn thị trường
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#E6B84F] sm:mt-2 hidden sm:flex items-center font-mono uppercase font-black tracking-[0.2em] px-2 sm:px-6">
            {earned.length}/{BADGES.length} ĐÃ MỞ KHÓA
          </p>
        </div>
      ) : null}

      {earned.length > 0 && (
        <section>
          <p className="mb-3 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/45">Đã mở khóa</p>
          <div className={compact ? "grid gap-3 xl:grid-cols-12" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
            {earned.map((badge, index) => {
              const style = TIER_STYLES[badge.tier];
              const cardSpan = compact ? (index < 3 ? "xl:col-span-4" : "xl:col-span-6") : "";
              return (
                <motion.article
                  key={badge.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "group rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5",
                    cardSpan,
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
                  <h4 className="font-heading text-[15px] font-black uppercase tracking-wide text-white/90">{badge.name}</h4>
                  <p className="mt-1.5 text-[13px] leading-relaxed font-semibold text-white/60">{badge.description}</p>
                </motion.article>
              );
            })}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section>
          <p className="mb-3 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white/35">Chưa mở khóa</p>
          <div className={compact ? "grid gap-2 xl:grid-cols-2" : "grid gap-2 sm:grid-cols-2 lg:grid-cols-3"}>
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
                  <p className="truncate font-heading text-[15px] font-black uppercase tracking-wide text-white/50">{badge.name}</p>
                  <p className="truncate mt-1.5 text-[13px] font-semibold text-white/35">{badge.description}</p>
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
