"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VetVangChat from "./VetVangChat";
import { getGamification, getLevelProgress } from "@/lib/gamification";

/* ─── Personality Messages ─── */
function getPersonalityMessage(streak: number, xp: number, hour: number): { text: string; mood: "happy" | "excited" | "sad" | "chill" | "proud" } {
  // Sad — 2+ days no visit
  if (streak === 0) {
    const sadMessages = [
      "Lâu quá không thấy bạn... Vẹt nhớ bạn lắm 🥺",
      "Bạn ơi quay lại đi, Vẹt buồn lắm rồi 😢",
      "Streak mất rồi... Nhưng không sao, bắt đầu lại nào! 💪",
    ];
    return { text: sadMessages[Math.floor(Math.random() * sadMessages.length)], mood: "sad" };
  }

  // Excited — streak >= 7
  if (streak >= 7) {
    const excitedMessages = [
      `🔥 ${streak} ngày liên tiếp! Bạn siêu ghê luôn!`,
      `Streak ${streak} ngày — Vẹt tự hào về bạn lắm! 🌟`,
      `${streak} ngày không bỏ cuộc! Bạn sắp thành Đại Gia rồi! 💎`,
      "Đỉnh quá! Vẹt phải học hỏi bạn mới được 🦜✨",
    ];
    return { text: excitedMessages[Math.floor(Math.random() * excitedMessages.length)], mood: "excited" };
  }

  // Morning (5-11)
  if (hour >= 5 && hour < 11) {
    const morningMessages = [
      "Chào buổi sáng! Nhớ ghi chi tiêu hôm nay nha 🌅",
      "Sáng rồi! Check thị trường đi, có tin mới đấy 📊",
      "Good morning! Cà phê xong nhớ xem Morning Brief nhé ☕",
      "Hôm nay nhớ ghi chi tiêu nha, đừng để cuối tháng hỏi tiền đi đâu! 🦜",
    ];
    return { text: morningMessages[Math.floor(Math.random() * morningMessages.length)], mood: "happy" };
  }

  // Afternoon (11-17)
  if (hour >= 11 && hour < 17) {
    const afternoonMessages = [
      "Ăn trưa chưa? Nhớ ghi khoản ăn trưa vào Quỹ Chi tiêu nhé 🍜",
      "Buổi chiều rảnh thì học 1 bài tài chính 60 giây đi! 📚",
      "Vàng SJC hôm nay thế nào nhỉ? Check Nhiệt kế thị trường xem! 🌡️",
    ];
    return { text: afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)], mood: "chill" };
  }

  // Evening (17-22)
  if (hour >= 17 && hour < 22) {
    const eveningMessages = [
      "Tổng kết ngày hôm nay: đã chi bao nhiêu rồi? 🌙",
      "Buổi tối rảnh rỗi — xem thử Xu hướng kinh tế tuần này nhé 📈",
      "Hôm nay chi tiêu hợp lý chưa? Vẹt check giúp cho! 🔍",
    ];
    return { text: eveningMessages[Math.floor(Math.random() * eveningMessages.length)], mood: "chill" };
  }

  // Night (22-5)
  const nightMessages = [
    "Khuya rồi, ngủ đi bạn ơi! Tài chính quan trọng nhưng sức khỏe còn quan trọng hơn 😴",
    "Vẹt cũng buồn ngủ rồi... mai nhớ quay lại nha! 🌙",
  ];
  return { text: nightMessages[Math.floor(Math.random() * nightMessages.length)], mood: "chill" };
}

/* ─── XP milestone messages ─── */
function getProudMessage(xp: number): string | null {
  if (xp >= 1000) return "💎 WOW! 1000 XP — Bạn là Đại Gia thứ thiệt!";
  if (xp >= 500) return "⭐ 500 XP! Vẹt Pro đây rồi!";
  if (xp >= 200) return "🦜 200 XP! Lên level Vẹt Trưởng thành!";
  if (xp >= 100) return "💪 100 XP! Tiến bộ nhanh quá!";
  return null;
}

export default function VetVangFloat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState<"happy" | "excited" | "sad" | "chill" | "proud">("happy");

  useEffect(() => {
    const gam = getGamification();
    setStreak(gam.streak);
    setXp(gam.xp);
    setMounted(true);

    const hour = new Date().getHours();
    const { text, mood: m } = getPersonalityMessage(gam.streak, gam.xp, hour);
    setMessage(text);
    setMood(m);

    // Rotate message every 30s
    const t = setInterval(() => {
      const g = getGamification();
      setStreak(g.streak);
      setXp(g.xp);
      const h = new Date().getHours();
      const { text: txt, mood: md } = getPersonalityMessage(g.streak, g.xp, h);
      setMessage(txt);
      setMood(md);
    }, 30000);

    const pulseTimer = setTimeout(() => setShowPulse(false), 5000);
    return () => { clearInterval(t); clearTimeout(pulseTimer); };
  }, []);

  const level = mounted ? getLevelProgress(xp) : null;

  // Mood → animation
  const moodAnimations = {
    happy: { y: [0, -3, 0], rotate: [0, 2, -2, 0] },
    excited: { y: [0, -6, 0], rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] },
    sad: { y: [0, -1, 0], rotate: [0, -3, 0] },
    chill: { y: [0, -2, 0] },
    proud: { y: [0, -4, 0], scale: [1, 1.1, 1] },
  };

  // Mood → glow color
  const moodGlow = {
    happy: "rgba(230,184,79,0.3)",
    excited: "rgba(255,107,53,0.4)",
    sad: "rgba(100,100,150,0.2)",
    chill: "rgba(230,184,79,0.2)",
    proud: "rgba(168,85,247,0.3)",
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setIsOpen(true); setShowPulse(false); }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, #E6B84F 0%, #D4A43F 50%, #B8942F 100%)",
              boxShadow: `0 0 30px ${moodGlow[mood]}, 0 8px 32px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Animated mascot */}
            <motion.span
              className="text-2xl"
              animate={moodAnimations[mood]}
              transition={{ duration: mood === "excited" ? 0.8 : 1.5, repeat: Infinity }}
            >
              {mood === "sad" ? "😢" : "🦜"}
            </motion.span>

            {/* Pulse ring */}
            {showPulse && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#E6B84F]"
                animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            {/* Streak badge */}
            {mounted && streak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF6B35] flex items-center justify-center text-[8px] font-bold text-white border-2 border-[#0A0B0F]"
              >
                🔥{streak}
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Message bubble — shows above FAB */}
      <AnimatePresence>
        {!isOpen && mounted && message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-[5.5rem] right-6 z-40 max-w-[220px]"
          >
            <div className="bg-[#1A1B23]/95 backdrop-blur-xl rounded-xl rounded-br-sm px-3 py-2 border border-white/[0.06] shadow-lg">
              <p className="text-[11px] text-white/60 leading-relaxed">{message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <VetVangChat
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        xp={xp}
        level={level ? level.current.emoji.replace(/[^\d]/g, '') ? 1 : 1 : 1}
        levelName={level ? level.current.name : "🐣 Vẹt Teen"}
      />
    </>
  );
}
