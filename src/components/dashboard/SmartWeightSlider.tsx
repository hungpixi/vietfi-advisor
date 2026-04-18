"use client";

import { motion } from "framer-motion";
import { Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CyberTypography } from "@/components/ui/CyberTypography";

interface SmartWeightSliderProps {
    id: string;
    name: string;
    emoji: string;
    value: number;
    officialWeight: number;
    isLocked: boolean;
    onValueChange: (id: string, val: number) => void;
    onLockToggle: (id: string) => void;
}

export function SmartWeightSlider({
    id,
    name,
    emoji,
    value,
    officialWeight,
    isLocked,
    onValueChange,
    onLockToggle,
}: SmartWeightSliderProps) {
    // GSO marker position in percentage (0-100)
    // Our max for sliders is usually 60-100. Let's assume 100 for normalization.
    const gsoPos = (officialWeight / 60) * 100; // Assuming max slider is 60 for better granularity
    const currentPos = (value / 60) * 100;

    return (
        <div className={cn(
            "group relative p-4 rounded-xl border transition-all duration-300",
            isLocked
                ? "bg-white/[0.02] border-white/[0.05] opacity-60"
                : "bg-white/[0.03] border-white/[0.08] hover:border-[#22C55E]/30 hover:bg-white/[0.05]"
        )}>
            {/* Header Area */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "text-2xl transition-all duration-300",
                        isLocked ? "grayscale" : "group-hover:scale-110"
                    )}>
                        {emoji}
                    </span>
                    <div>
                        <CyberTypography size="xs" className="text-white/80 block uppercase tracking-wider">{name}</CyberTypography>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/30 font-mono uppercase">GSO: {officialWeight}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className={cn(
                            "text-xl font-black font-mono leading-none",
                            Math.abs(value - officialWeight) < 0.5 ? "text-[#22C55E]" : "text-white"
                        )}>
                            {value.toFixed(1)}%
                        </span>
                    </div>

                    <button
                        onClick={() => onLockToggle(id)}
                        className={cn(
                            "p-2 rounded-lg border transition-all",
                            isLocked
                                ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]"
                                : "bg-white/5 border-white/10 text-white/20 hover:text-white/50 hover:bg-white/10"
                        )}
                    >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Control Area */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative h-6 flex items-center">
                    {/* Slider Track */}
                    <div className="absolute inset-0 h-1.5 my-auto bg-white/5 rounded-full overflow-hidden">
                        {/* Progress Fill */}
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#22C55E]/40 to-[#22C55E]"
                            initial={false}
                            animate={{ width: `${currentPos}%` }}
                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        />
                    </div>

                    {/* GSO Marker */}
                    <div
                        className="absolute h-4 w-0.5 bg-white/20 z-10"
                        style={{ left: `${gsoPos}%`, top: '50%', transform: 'translateY(-50%)' }}
                    >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-white/20">GSO</div>
                    </div>

                    {/* Actual Input Range (Hidden but functional) */}
                    <input
                        type="range"
                        min={0}
                        max={60}
                        step={0.1}
                        value={value}
                        disabled={isLocked}
                        onChange={(e) => onValueChange(id, parseFloat(e.target.value))}
                        className={cn(
                            "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20",
                            isLocked && "cursor-not-allowed"
                        )}
                    />

                    {/* Custom Thumb */}
                    <motion.div
                        className={cn(
                            "absolute w-4 h-4 rounded-full border-2 border-[#22C55E] bg-black shadow-[0_0_10px_rgba(34,197,94,0.5)] z-10 pointer-events-none",
                            isLocked && "border-white/20 shadow-none bg-white/10"
                        )}
                        initial={false}
                        animate={{ left: `calc(${currentPos}% - 8px)` }}
                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    />
                </div>

                {/* +/- Quick Adjust */}
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => !isLocked && onValueChange(id, Math.min(60, value + 1))}
                        disabled={isLocked}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                    >
                        <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => !isLocked && onValueChange(id, Math.max(0, value - 1))}
                        disabled={isLocked}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                    >
                        <ChevronDown className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
