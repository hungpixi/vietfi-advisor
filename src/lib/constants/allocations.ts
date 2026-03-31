/* ═══════════════════════════════════════════════════════════
 * Portfolio Allocation Constants & Logic
 * Shared between Dashboard and Portfolio pages.
 * ═══════════════════════════════════════════════════════════ */

export interface AllocationItem {
  asset: string;
  percent: number;
  color: string;
}

export const BASE_ALLOCATIONS: Record<string, AllocationItem[]> = {
  conservative: [
    { asset: "Tiết kiệm", percent: 50, color: "#00E5FF" },
    { asset: "Trái phiếu", percent: 20, color: "#AB47BC" },
    { asset: "Vàng", percent: 20, color: "#E6B84F" },
    { asset: "Chứng khoán", percent: 10, color: "#22C55E" },
  ],
  balanced: [
    { asset: "Tiết kiệm", percent: 30, color: "#00E5FF" },
    { asset: "Vàng", percent: 20, color: "#E6B84F" },
    { asset: "Chứng khoán", percent: 30, color: "#22C55E" },
    { asset: "Crypto", percent: 10, color: "#AB47BC" },
    { asset: "BĐS (REIT)", percent: 10, color: "#FF6B35" },
  ],
  growth: [
    { asset: "Tiết kiệm", percent: 15, color: "#00E5FF" },
    { asset: "Vàng", percent: 10, color: "#E6B84F" },
    { asset: "Chứng khoán", percent: 40, color: "#22C55E" },
    { asset: "Crypto", percent: 25, color: "#AB47BC" },
    { asset: "BĐS (REIT)", percent: 10, color: "#FF6B35" },
  ],
};

/**
 * Adjusts base allocation based on Fear & Greed index.
 * F&G < 30 (Fear) -> Increase safe assets (Savings/Gold), decrease risky (Stocks/Crypto).
 * F&G > 70 (Greed) -> Decrease risky adds, increase cash reserves.
 */
export function adjustAllocation(base: AllocationItem[], fgScore: number): AllocationItem[] {
  const shift = fgScore <= 30 ? -5 : fgScore >= 70 ? -3 : 0;
  return base.map((item) => {
    let adj = item.percent;
    if (item.asset === "Chứng khoán" || item.asset === "Crypto") adj += shift;
    if (item.asset === "Tiết kiệm" || item.asset === "Vàng") adj -= shift;
    return { ...item, percent: Math.max(5, Math.min(60, adj)) };
  });
}
