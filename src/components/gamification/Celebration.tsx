"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Confetti Canvas ─── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const COLORS = ["#E6B84F", "#FFD700", "#FF6B35", "#22C55E", "#3B82F6", "#A855F7", "#EC4899"];

function createParticles(count: number, width: number, height: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: width / 2 + (Math.random() - 0.5) * width * 0.5,
    y: height * 0.3,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 15 - 5,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    opacity: 1,
  }));
}

export function ConfettiCannon({ active, onDone }: { active: boolean; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = 0;
    for (const p of particlesRef.current) {
      p.x += p.vx;
      p.vy += 0.3; // gravity
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.008;
      p.vx *= 0.99;

      if (p.opacity <= 0) continue;
      alive++;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (alive > 0) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      onDone();
    }
  }, [onDone]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particlesRef.current = createParticles(120, canvas.width, canvas.height);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, animate]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[200] pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

/* ─── Level Up Modal ─── */
export function LevelUpModal({
  show,
  level,
  emoji,
  onClose,
}: {
  show: boolean;
  level: string;
  emoji: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="relative text-center p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow ring */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-[#E6B84F]/20 rounded-full blur-3xl"
            />

            {/* Emoji */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-7xl mb-4 relative"
            >
              {emoji}
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#E6B84F]/60 mb-2">
                LEVEL UP
              </p>
              <h2 className="text-3xl font-black text-white mb-2">{level}</h2>
              <p className="text-sm text-white/40">Tiếp tục phát huy nhé! 🎉</p>
            </motion.div>

            {/* Tap to close */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-[10px] text-white/20 mt-6"
            >
              Nhấn để đóng
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Quest Complete Toast ─── */
export function QuestCompleteToast({ show, questName, xp }: { show: boolean; questName: string; xp: number }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-[#22C55E]/20 rounded-2xl blur-xl" />
            <div className="relative flex items-center gap-3 px-5 py-3 bg-[#1A1B23]/95 backdrop-blur-xl rounded-2xl border border-[#22C55E]/20 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5 }}
                className="text-2xl"
              >
                ✅
              </motion.span>
              <div>
                <p className="text-sm font-bold text-white">{questName}</p>
                <p className="text-xs text-[#22C55E] font-bold">+{xp} XP đã nhận!</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
