"use client";

import { useState, useEffect, useRef } from "react";
import VetVangChat from "./VetVangChat";
import { getGamification, getLevelProgress } from "@/lib/gamification";
import { motion, AnimatePresence } from "framer-motion";

const ROASTS = [
  "Ê, tháng nay xài lố chưa đó?",
  "Còn tiền không mà cứ lượn qua lượn lại?",
  "Bấm dô chat đi, tui chửi cho tỉnh!",
  "Đừng có mua sắm tào lao nữa nha mậy!",
  "Có gì khai báo không? Tui đang dòm nè!",
  "Trễ rồi đó nha, ghi sổ chi tiêu chưa?",
  "Sao? Lại tính mua gì nữa hả?",
];

export default function VetVangFloat() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const [activeRoast, setActiveRoast] = useState<string | null>(null);
  const roastTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const gam = getGamification();
    setStreak(gam.streak);
    setXp(gam.xp);
    setMounted(true);
  }, []);

  // Random roast every 45s
  useEffect(() => {
    if (!mounted || isOpen) return;
    
    roastTimer.current = setInterval(() => {
      if (Math.random() > 0.4) { // 60% chance to show roast
        const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
        setActiveRoast(roast);
        setTimeout(() => setActiveRoast(null), 6000); // 6s duration
      }
    }, 45000);

    return () => clearInterval(roastTimer.current as NodeJS.Timeout);
  }, [mounted, isOpen]);

  const triggerHoverRoast = () => {
    setIsHovered(true);
    if (!activeRoast && Math.random() > 0.6) { // 40% chance on hover
      const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
      setActiveRoast(roast);
      setTimeout(() => setActiveRoast(null), 4000);
    }
  };

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
      {/* Floating Tamagotchi Widget */}
      <AnimatePresence>
        {!isOpen && mounted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className="fixed bottom-4 right-4 z-50 flex items-end justify-end pointer-events-none"
          >
            {/* Dynamic Speech Bubble */}
            <AnimatePresence>
              {activeRoast && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute right-16 bottom-12 mb-2 mr-2 max-w-[200px] bg-white text-[#111318] text-[13px] font-bold px-4 py-2.5 rounded-2xl rounded-br-sm shadow-[0_8px_30px_rgba(230,184,79,0.3)] z-40 border border-[#E6B84F]/50"
                  style={{ transformOrigin: "bottom right" }}
                >
                  {activeRoast}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Mascot Area */}
            <button
              onMouseEnter={triggerHoverRoast}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => {
                setIsOpen(true);
                setActiveRoast(null);
              }}
              className="relative pointer-events-auto flex items-center justify-center cursor-pointer group outline-none w-24 h-24"
              aria-label="Mở Vẹt Vàng AI Chat"
            >
              {/* Dynamic Glow Background */}
              <motion.div 
                className="absolute inset-0 bg-[#E6B84F] rounded-full filter blur-2xl opacity-10 transition-opacity duration-300"
                animate={{ opacity: isHovered ? 0.3 : 0.1, scale: isHovered ? 1.5 : 1 }}
              />

              {/* Breathing Mascot */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-20 h-20 transition-transform duration-300 group-hover:scale-110 group-active:scale-95 flex items-center justify-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              >
                <img
                  src={getMascotImage()}
                  alt="Vẹt Vàng AI"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(230,184,79,0.4)]"
                />

                {/* Streak badge */}
                {streak > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-0 w-6 h-6 rounded-full bg-gradient-to-tr from-[#FF6B35] to-[#FF8E53] flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#111318] shadow-lg"
                  >
                    {streak}⚡
                  </motion.div>
                )}
                
                {/* Level / Status Text Pill on Hover */}
                <AnimatePresence>
                  {isHovered && !activeRoast && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute -bottom-2 whitespace-nowrap bg-[#111318] border border-[#E6B84F]/30 text-[#E6B84F] text-[10px] font-bold px-3 py-1 rounded-full shadow-lg"
                    >
                      Hỏi Vẹt Vàng ({levelName})
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
