import type { MarketZone } from "./types";

export function getZone(score: number): MarketZone {
    if (score <= 20) return { label: "Cực kỳ sợ hãi", color: "#EF4444" };
    if (score <= 40) return { label: "Sợ hãi", color: "#F97316" };
    if (score <= 60) return { label: "Trung lập", color: "#F1D17A" };
    if (score <= 80) return { label: "Tham lam", color: "#22C55E" };
    return { label: "Cực kỳ tham lam", color: "#10B981" };
}

export function formatPercent(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}

export function formatCompactVnd(value: number): string {
    return `${(value / 1_000_000).toFixed(1)} tr`;
}

export function formatMarketTime(value: string | null): string | null {
    if (!value) return null;
    return new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}
