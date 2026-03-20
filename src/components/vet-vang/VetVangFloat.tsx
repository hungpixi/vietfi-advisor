"use client";

import { useState, useEffect } from "react";
import VetVangChat from "./VetVangChat";
import { getGamification, getLevelProgress } from "@/lib/gamification";

export default function VetVangFloat() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    const gam = getGamification();
    setStreak(gam.streak);
    setXp(gam.xp);
    setMounted(true);
  }, []);

  const rawLevelNumber = xp >= 1000 ? 5 : xp >= 500 ? 4 : xp >= 200 ? 3 : xp >= 100 ? 2 : 1;
  const level = mounted ? getLevelProgress(xp) : null;
  const levelName = level ? level.current.name : "Vẹt Con";

  const getMascotImage = () => {
    switch (rawLevelNumber) {
      case 1: return "/assets/level-1-con.png";
      case 2: return "/assets/level-2-teen.png";
      case 3: return "/assets/level-3-truong-thanh.png";
      case 4: return "/assets/level-4-dai-gia.png";
      case 5: return "/assets/level-5-ong-hoang.png";
      default: return "/assets/level-1-con.png";
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && mounted && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-[#E6B84F] to-[#C4943A] shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border-2 border-[#E6B84F]/30 cursor-pointer"
          aria-label="Mở Vẹt Vàng AI Chat"
        >
          <img
            src={getMascotImage()}
            alt="Vẹt Vàng AI"
            className="w-12 h-12 object-contain pointer-events-none"
          />

          {/* Streak badge */}
          {streak > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-[#FF6B35] to-[#FF8E53] flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#0A0B0F]">
              {streak}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      <VetVangChat
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        xp={xp}
        level={rawLevelNumber}
        levelName={levelName}
      />
    </>
  );
}
