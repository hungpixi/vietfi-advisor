"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

const DATA_STREAMS = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    x: (i * 13 + 7) % 100,
    y: (i * 23 + 11) % 100,
    width: 0.5 + (i % 3) * 0.35,
    length: 12 + (i % 5) * 7,
    duration: 16 + (i % 6) * 4,
    delay: (i % 5) * 1.7,
    opacity: 0.03 + (i % 4) * 0.012,
}));

export const CyberBackground = () => {
    // Generate random data streams for the SVG layer
    const streams = useMemo(() => {
        return DATA_STREAMS;
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#050A09]">
            {/* 1. Base Gradient & Vignette */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#000000] opacity-60" />

            {/* 2. Technical Grid Layer */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
            linear-gradient(to right, #22C55E 1px, transparent 1px),
            linear-gradient(to bottom, #22C55E 1px, transparent 1px)
          `,
                    backgroundSize: '60px 60px'
                }}
            />
            <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                    backgroundImage: `
            linear-gradient(to right, #22C55E 1px, transparent 1px),
            linear-gradient(to bottom, #22C55E 1px, transparent 1px)
          `,
                    backgroundSize: '12px 12px'
                }}
            />

            {/* 3. Data Streams (SVG) */}
            <svg className="absolute inset-0 w-full h-full">
                <defs>
                    <linearGradient id="stream-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#22C55E" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                {streams.map((s) => (
                    <motion.rect
                        key={s.id}
                        x={`${s.x}%`}
                        y={`${s.y}%`}
                        width={`${s.length}%`}
                        height={s.width}
                        fill="url(#stream-gradient)"
                        style={{ opacity: s.opacity }}
                        animate={{
                            x: [`${s.x}%`, `${s.x + 20}%`, `${s.x}%`],
                            opacity: [s.opacity, s.opacity * 2, s.opacity],
                        }}
                        transition={{
                            duration: s.duration,
                            delay: s.delay,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>

            {/* 4. Scanner Line */}
            <motion.div
                className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#22C55E]/10 to-transparent"
                animate={{ y: ['-10vh', '110vh'] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />

            {/* 5. Noise Overlay */}
            <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
                style={{ backgroundImage: 'url("https://grains-img.vercel.app/noise.png")' }}>
            </div>
        </div>
    );
};
