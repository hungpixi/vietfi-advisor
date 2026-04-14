"use client";
import { motion } from "framer-motion";

type AnimState = "idle" | "celebrate" | "sleepy" | "angry" | "thinking" | "peek" | "welcome" | "scared" | "bounce" | "fly-across";

interface AnimatedParrotProps {
  state?: AnimState;
  size?: number;
  level?: number;
}

/* ─── Part layout (relative to 200x240 canvas) ─── */
const PARTS = {
  body:    { src: "/animations/parts/parrot-body.png",   x: 25,  y: 75,  w: 150, h: 165, origin: "center" },
  wing_l:  { src: "/animations/parts/parrot-wing-l.png", x: -15, y: 85,  w: 90,  h: 120, origin: "top right" },
  wing_r:  { src: "/animations/parts/parrot-wing-r.png", x: 125, y: 85,  w: 90,  h: 120, origin: "top left" },
  head:    { src: "/animations/parts/parrot-head.png",   x: 20,  y: -10, w: 160, h: 160, origin: "bottom center" },
};

/* ─── Animation variants per state ─── */
type PartAnimationMap = Record<string, unknown>;
const VARIANTS: Record<AnimState, PartAnimationMap> = {
  idle: {
    body: { y: [0, -4, 0], transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } },
    head: { y: [0, -6, 0], rotate: [0, 1.5, 0, -1.5, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
    wing_l: { rotate: [0, -6, 0], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
    wing_r: { rotate: [0, 6, 0], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
  },
  celebrate: {
    body: { y: [0, -15, 0], scale: [1, 1.05, 1], transition: { duration: 0.5, repeat: Infinity, ease: "easeOut" } },
    head: { y: [0, -20, 0], rotate: [0, -5, 5, 0], transition: { duration: 0.6, repeat: Infinity } },
    wing_l: { rotate: [0, -35, 0], transition: { duration: 0.4, repeat: Infinity } },
    wing_r: { rotate: [0, 35, 0], transition: { duration: 0.4, repeat: Infinity } },
  },
  sleepy: {
    body: { y: [0, 3, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
    head: { y: [0, 5, 0], rotate: [0, 8, 12, 8, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
    wing_l: { rotate: [0, 3, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
    wing_r: { rotate: [0, -3, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  },
  angry: {
    body: { x: [-3, 3, -3, 3, 0], transition: { duration: 0.3, repeat: Infinity } },
    head: { x: [-4, 4, -4, 4, 0], rotate: [-3, 3, -3, 3, 0], transition: { duration: 0.25, repeat: Infinity } },
    wing_l: { rotate: [-15, -20, -15], transition: { duration: 0.3, repeat: Infinity } },
    wing_r: { rotate: [15, 20, 15], transition: { duration: 0.3, repeat: Infinity } },
  },
  thinking: {
    body: { y: [0, -2, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
    head: { rotate: [0, 8, 0, -5, 0], y: [0, -3, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
    wing_l: { rotate: [0, 5, 15, 5, 0], transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } },
    wing_r: { rotate: [0, -2, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  },
  peek: {
    body: { x: [80, 30], opacity: [0, 1], transition: { duration: 0.8, ease: "easeOut" } },
    head: { x: [80, 30], rotate: [-10, 5], opacity: [0, 1], transition: { duration: 0.8, ease: "easeOut", delay: 0.1 } },
    wing_l: { opacity: 0, transition: { duration: 0 } },
    wing_r: { x: [80, 30], opacity: [0, 1], transition: { duration: 0.8, ease: "easeOut", delay: 0.15 } },
  },
  welcome: {
    body: { x: [-100, 0], opacity: [0, 1], transition: { duration: 0.6, type: "spring", stiffness: 120 } },
    head: { x: [-100, 0], opacity: [0, 1], transition: { duration: 0.7, type: "spring", stiffness: 120, delay: 0.05 } },
    wing_l: { x: [-100, 0], rotate: [0, -25, 0], opacity: [0, 1], transition: { duration: 0.8, type: "spring", delay: 0.1 } },
    wing_r: { x: [-100, 0], rotate: [0, 25, 0], opacity: [0, 1], transition: { duration: 0.8, type: "spring", delay: 0.1 } },
  },
  scared: {
    body: { y: [0, 40], scale: [1, 0.9], transition: { duration: 0.4, ease: "easeIn" } },
    head: { y: [0, 30], scale: [1, 0.85], transition: { duration: 0.35 } },
    wing_l: { rotate: -25, transition: { duration: 0.3 } },
    wing_r: { rotate: 25, transition: { duration: 0.3 } },
  },
  bounce: {
    body: { y: [0, -20, 0, -10, 0], transition: { duration: 0.6, repeat: Infinity } },
    head: { y: [0, -25, 0, -12, 0], transition: { duration: 0.6, repeat: Infinity, delay: 0.05 } },
    wing_l: { rotate: [0, -20, 0, -10, 0], transition: { duration: 0.6, repeat: Infinity } },
    wing_r: { rotate: [0, 20, 0, 10, 0], transition: { duration: 0.6, repeat: Infinity } },
  },
  "fly-across": {
    body: { x: [-200, 400], transition: { duration: 2, ease: "linear" } },
    head: { x: [-200, 400], transition: { duration: 2, ease: "linear", delay: 0.02 } },
    wing_l: { x: [-200, 400], rotate: [0, -30, 0, -30, 0], transition: { duration: 2, ease: "linear" } },
    wing_r: { x: [-200, 400], rotate: [0, 30, 0, 30, 0], transition: { duration: 2, ease: "linear" } },
  },
};

export default function AnimatedParrot({ state = "idle", size = 200 }: AnimatedParrotProps) {
  const scale = size / 200;
  const variants = VARIANTS[state] || VARIANTS.idle;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size * 1.2,
        overflow: "visible",
      }}
    >
      {/* Render order: body first (back), then wings, then head (front) */}
      {(["body", "wing_l", "wing_r", "head"] as const).map((key) => {
        const part = PARTS[key];
        const variant = variants[key] || {};
        return (
          <motion.div
            key={`${key}-${state}`}
            animate={variant}
            style={{
              position: "absolute",
              left: part.x * scale,
              top: part.y * scale,
              width: part.w * scale,
              height: part.h * scale,
              transformOrigin: part.origin,
              zIndex: key === "head" ? 3 : key === "body" ? 1 : 2,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={part.src}
              alt={key}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              draggable={false}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
