/**
 * market-regime.ts
 * Logic for calculating Market Regime (Bull, Neutral, Bear based on VNINDEX and Breadth)
 */
import { OHLCV, calculateSMA } from "./indicators";

export type RegimeType = "BULL" | "NEUTRAL" | "BEAR";

export interface MarketRegimeStatus {
    date: string;
    closePrice: number;
    ma50: number;
    ma200: number;
    breadthAdvancers?: number;
    breadthDecliners?: number;
    breadthUnchanged?: number;
    regime: RegimeType;
}

/**
 * Calculates Market Regime from a stream of Index Bars.
 * Bull: Price > MA50 and Price > MA200
 * Bear: Price < MA50 and Price < MA200
 * Neutral: Otherwise (e.g. chopping between MA50 and 200)
 */
export function calculateMarketRegime(indexBars: OHLCV[]): MarketRegimeStatus[] {
    const closePrices = indexBars.map(b => b.close);
    const ma50 = calculateSMA(closePrices, 50);
    const ma200 = calculateSMA(closePrices, 200);

    const results: MarketRegimeStatus[] = [];

    for (let i = 0; i < indexBars.length; i++) {
        const bar = indexBars[i];
        const p50 = ma50[i];
        const p200 = ma200[i];

        let regime: RegimeType = "NEUTRAL";

        // Safety check if MA not formed yet
        if (!isNaN(p50) && !isNaN(p200)) {
            if (bar.close > p50 && bar.close > p200) {
                regime = "BULL";
            } else if (bar.close < p50 && bar.close < p200) {
                regime = "BEAR";
            }
            // Can add more sophisticated rules here later, e.g. MA50 > MA200
        } // If only MA50 exists
        else if (!isNaN(p50)) {
            regime = bar.close > p50 ? "BULL" : "BEAR";
        }

        results.push({
            date: bar.date,
            closePrice: bar.close,
            ma50: p50,
            ma200: p200,
            regime,
        });
    }

    return results;
}
