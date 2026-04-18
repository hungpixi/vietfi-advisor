/**
 * indicators.ts
 * Core logic for Time Series mathematical calculations required for Strategy Engine.
 */

export interface OHLCV {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// 1. Moving Averages (SMA / EMA)
export function calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(NaN); // Not enough data
            continue;
        }
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
    }
    return result;
}

// 2. Relative Strength (RS) - IBD Style (Rate of Change / Momentum over period)
// Calculate typical 3m (63 days), 6m (126 days), 12m (252 days) momentum.
export function calculateRateOfChange(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            result.push(NaN);
            continue;
        }
        const todayClose = data[i];
        const pastClose = data[i - period];
        if (pastClose === 0) result.push(0);
        else result.push(((todayClose - pastClose) / pastClose) * 100);
    }
    return result;
}

// Composite RS Score (Relative to the Universe):
// A function that takes ROs of all tickers and ranks them 1-99
export function assignRelativeStrengthRank(
    tickerRocMap: Record<string, number>
): Record<string, number> {
    // Sort from lowest ROC to highest
    const sortedTickers = Object.keys(tickerRocMap)
        .filter((t) => !isNaN(tickerRocMap[t]))
        .sort((a, b) => tickerRocMap[a] - tickerRocMap[b]);

    const total = sortedTickers.length;
    if (total === 0) return {};

    const ranks: Record<string, number> = {};
    sortedTickers.forEach((ticker, index) => {
        // scale to 1-99 percentile
        const rank = Math.round(((index + 1) / total) * 99);
        ranks[ticker] = rank === 0 ? 1 : rank;
    });

    return ranks;
}

// 3. True Range (TR) & Average True Range (ATR)
export function calculateATR(bars: OHLCV[], period: number): number[] {
    const tr: number[] = [];
    for (let i = 0; i < bars.length; i++) {
        const high = bars[i].high;
        const low = bars[i].low;
        if (i === 0) {
            tr.push(high - low);
        } else {
            const prevClose = bars[i - 1].close;
            tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
        }
    }

    // Calculate SMA of TR to get ATR (can optionally use EMA/Wilder's smoothing)
    return calculateSMA(tr, period);
}
