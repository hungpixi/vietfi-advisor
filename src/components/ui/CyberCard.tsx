import React from "react";
import { cn } from "@/lib/utils";

interface CyberCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: "success" | "danger" | "neutral";
    showDecorators?: boolean;
}

export function CyberCard({
    children,
    className,
    variant = "success",
    showDecorators = true,
    ...props
}: CyberCardProps) {
    const glowColor = variant === "danger" ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)";
    const hoverBorderColor = variant === "danger" ? "group-hover:border-red-500/20" : "group-hover:border-[#22C55E]/20";

    return (
        <div
            className={cn(
                "group relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500",
                hoverBorderColor,
                className
            )}
            {...props}
        >
            {/* Background System */}
            <div className="absolute inset-0 z-0">
                {/* Layer 1: Dark Gradient */}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />

                {/* Layer 2: Radial Glow */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `radial-gradient(circle at 50% 35%, ${glowColor}, transparent 46%)`
                    }}
                />

                {/* Layer 3: Grid Overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />
            </div>

            {/* Border Decorators */}
            {showDecorators && (
                <>
                    <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-white/20 transition-all group-hover:border-white/40" />
                    <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-white/10 transition-all group-hover:border-white/20" />
                </>
            )}

            {/* Content */}
            <div className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">
                {children}
            </div>
        </div>
    );
}
