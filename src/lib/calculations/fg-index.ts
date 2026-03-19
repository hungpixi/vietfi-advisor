/* ═══════════════════════════════════════════════════════════
 * Fear & Greed Index VN — 5 Indicators
 * ═══════════════════════════════════════════════════════════ */

export interface MarketDataInput {
  vnIndex: number;
  vnIndexMA125: number;
  advances: number;      // số mã tăng giá
  declines: number;      // số mã giảm giá
  totalStocks: number;
  foreignNetBuy: number; // tỷ VND, âm = bán ròng
  foreignNetBuy30dAvg: number;
  foreignNetBuy30dStd: number;
  newsSentimentScore: number; // 0-100 từ sentiment agent
  goldPriceChange: number;   // % thay đổi vàng SJC
  vnIndexChange: number;     // % thay đổi VN-Index
}

export interface FGResult {
  score: number;
  zone: string;
  label: string;
  color: string;
  indicators: {
    priceMomentum: number;
    marketBreadth: number;
    foreignFlow: number;
    newsSentiment: number;
    safeHavenDemand: number;
  };
}

/* ─── Normalize to 0-100 ─── */
function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

/* ─── Indicator 1: Price Momentum (VN-Index vs MA125) ─── */
function calcPriceMomentum(current: number, ma125: number): number {
  const deviation = ((current - ma125) / ma125) * 100;
  // -10% deviation = 0 (extreme fear), +10% = 100 (extreme greed)
  return clamp(50 + deviation * 5);
}

/* ─── Indicator 2: Market Breadth (A/D ratio) ─── */
function calcMarketBreadth(advances: number, declines: number, total: number): number {
  if (total === 0) return 50;
  const ratio = (advances - declines) / total;
  // -0.5 = 0 (fear), +0.5 = 100 (greed)
  return clamp(50 + ratio * 100);
}

/* ─── Indicator 3: Foreign Flow (Z-score) ─── */
function calcForeignFlow(net: number, avg30d: number, std30d: number): number {
  if (std30d === 0) return 50;
  const zScore = (net - avg30d) / std30d;
  // z=-2 = 0 (extreme sell), z=+2 = 100 (extreme buy)
  return clamp(50 + zScore * 25);
}

/* ─── Indicator 4: News Sentiment (pass-through) ─── */
function calcNewsSentiment(score: number): number {
  return clamp(score);
}

/* ─── Indicator 5: Safe Haven Demand (Gold vs VN-Index) ─── */
function calcSafeHaven(goldChange: number, vnIndexChange: number): number {
  // Gold up + stocks down = fear → low score
  // Gold down + stocks up = greed → high score
  const spread = vnIndexChange - goldChange;
  // spread -5% (flight to safety) = 0, spread +5% = 100
  return clamp(50 + spread * 10);
}

/* ─── Zone mapping ─── */
function getZone(score: number): { zone: string; label: string; color: string } {
  if (score <= 20) return { zone: "extreme_fear", label: "Cực kỳ sợ hãi", color: "#FF1744" };
  if (score <= 40) return { zone: "fear", label: "Sợ hãi", color: "#FF5252" };
  if (score <= 60) return { zone: "neutral", label: "Trung lập", color: "#FFD700" };
  if (score <= 80) return { zone: "greed", label: "Tham lam", color: "#00E676" };
  return { zone: "extreme_greed", label: "Cực kỳ tham lam", color: "#00C853" };
}

/* ═══════════════════ MAIN ═══════════════════ */
export function calculateFearGreed(data: MarketDataInput): FGResult {
  const indicators = {
    priceMomentum: calcPriceMomentum(data.vnIndex, data.vnIndexMA125),
    marketBreadth: calcMarketBreadth(data.advances, data.declines, data.totalStocks),
    foreignFlow: calcForeignFlow(data.foreignNetBuy, data.foreignNetBuy30dAvg, data.foreignNetBuy30dStd),
    newsSentiment: calcNewsSentiment(data.newsSentimentScore),
    safeHavenDemand: calcSafeHaven(data.goldPriceChange, data.vnIndexChange),
  };

  // Weighted average (sum = 100%)
  const score = Math.round(
    indicators.priceMomentum * 0.20 +
    indicators.marketBreadth * 0.20 +
    indicators.foreignFlow * 0.25 +
    indicators.newsSentiment * 0.20 +
    indicators.safeHavenDemand * 0.15
  );

  const { zone, label, color } = getZone(score);

  return { score, zone, label, color, indicators };
}
