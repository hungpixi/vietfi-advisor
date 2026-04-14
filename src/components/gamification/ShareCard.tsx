"use client";

import { useRef } from "react";
import { Share2 } from "lucide-react";
import { getGamification, getLevelProgress } from "@/lib/gamification";

/* ─── Card Templates ─── */
interface ShareCardProps {
  type: "fg" | "streak" | "risk";
  fgScore?: number;
  riskProfile?: string;
}

const FG_ZONES = [
  { max: 20, label: "Cực kỳ Sợ hãi", color: "#EF4444", emoji: "😱" },
  { max: 40, label: "Sợ hãi", color: "#F97316", emoji: "😰" },
  { max: 60, label: "Trung lập", color: "#EAB308", emoji: "😐" },
  { max: 80, label: "Tham lam", color: "#22C55E", emoji: "🤑" },
  { max: 100, label: "Cực kỳ Tham lam", color: "#EF4444", emoji: "🔥" },
];

function getZone(score: number) {
  return FG_ZONES.find(z => score <= z.max) || FG_ZONES[4];
}

export function ShareableCard({ type, fgScore = 42, riskProfile = "Tăng trưởng" }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const gam = getGamification();

  async function handleShare() {
    if (!cardRef.current) return;
    try {
      // Simple clipboard/download fallback without html2canvas
      const text = type === "fg" ? `VietFi F&G Index: ${fgScore}` : type === "streak" ? `🔥 ${gam.streak} ngày streak` : `Risk DNA: ${riskProfile}`;
      if (navigator.share) {
        await navigator.share({ text, url: "https://vietfi.app" });
      } else {
        await navigator.clipboard.writeText(text + " — VietFi Advisor");
        alert("Đã copy! Paste để chia sẻ.");
      }
    } catch {
      // Fallback: just alert
      alert("Chức năng chia sẻ chưa khả dụng trên trình duyệt này. Hãy chụp màn hình!");
    }
  }

  if (type === "fg") {
    const zone = getZone(fgScore);
    return (
      <div className="space-y-2">
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, #0A0B0F 0%, #1A1B23 100%)" }}
        >
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl opacity-20"
            style={{ background: zone.color }} />

          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 mb-3">
            FEAR & GREED INDEX VIETNAM
          </p>
          <p className="text-5xl font-black text-white mb-1">{fgScore}</p>
          <p className="text-sm font-bold mb-1" style={{ color: zone.color }}>
            {zone.emoji} {zone.label}
          </p>
          <p className="text-[10px] text-white/20 mb-4">
            {new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>

          {/* Brand */}
          <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-white/[0.05]">
            <span className="text-[10px] font-bold text-[#E6B84F]">VietFi</span>
            <span className="text-[10px] text-white/20">Advisor</span>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#E6B84F] bg-[#E6B84F]/10 rounded-xl hover:bg-[#E6B84F]/20 transition"
        >
          <Share2 className="w-3 h-3" /> Chia sẻ
        </button>
      </div>
    );
  }

  if (type === "streak") {
    return (
      <div className="space-y-2">
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, #0A0B0F 0%, #1A1B23 100%)" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl opacity-20 bg-orange-500" />

          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 mb-3">
            STREAK RECORD
          </p>
          <p className="text-5xl mb-1">🔥</p>
          <p className="text-4xl font-black text-white mb-1">{gam.streak} ngày</p>
          <p className="text-xs text-white/30 mb-1">liên tiếp quản lý tài chính</p>
          <p className="text-sm font-bold text-[#E6B84F]">
            {getLevelProgress(gam.xp).current.emoji} {getLevelProgress(gam.xp).current.name} • {gam.xp} XP
          </p>

          <div className="flex items-center justify-center gap-1.5 pt-3 mt-3 border-t border-white/[0.05]">
            <span className="text-[10px] font-bold text-[#E6B84F]">VietFi</span>
            <span className="text-[10px] text-white/20">Advisor</span>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-orange-400 bg-orange-500/10 rounded-xl hover:bg-orange-500/20 transition"
        >
          <Share2 className="w-3 h-3" /> Khoe streak
        </button>
      </div>
    );
  }

  // Risk DNA card
  const RISK_PROFILES: Record<string, { emoji: string; color: string; desc: string }> = {
    "Bảo thủ": { emoji: "🛡️", color: "#3B82F6", desc: "An toàn là trên hết" },
    "Cân bằng": { emoji: "⚖️", color: "#8B5CF6", desc: "Ổn định kết hợp tăng trưởng" },
    "Tăng trưởng": { emoji: "🚀", color: "#22C55E", desc: "Chấp nhận rủi ro để tăng trưởng" },
    "Mạo hiểm": { emoji: "💎", color: "#E6B84F", desc: "High risk, high reward" },
  };
  const profile = RISK_PROFILES[riskProfile] || RISK_PROFILES["Tăng trưởng"];

  return (
    <div className="space-y-2">
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl p-6 text-center"
        style={{ background: "linear-gradient(135deg, #0A0B0F 0%, #1A1B23 100%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl opacity-15"
          style={{ background: profile.color }} />

        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 mb-3">
          RISK DNA PROFILE
        </p>
        <p className="text-5xl mb-2">{profile.emoji}</p>
        <p className="text-2xl font-black text-white mb-1">Nhà Đầu Tư {riskProfile}</p>
        <p className="text-xs text-white/30 mb-4">{profile.desc}</p>

        <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-white/[0.05]">
          <span className="text-[10px] font-bold text-[#E6B84F]">VietFi</span>
          <span className="text-[10px] text-white/20">Advisor • Risk DNA Test</span>
        </div>
      </div>
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition"
        style={{ color: profile.color, background: `${profile.color}15` }}
      >
        <Share2 className="w-3 h-3" /> Chia sẻ Risk DNA
      </button>
    </div>
  );
}
