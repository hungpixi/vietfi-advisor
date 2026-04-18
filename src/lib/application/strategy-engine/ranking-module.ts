/**
 * ranking-module.ts
 * Lọc và xếp hạng cổ phiếu theo Sức mạnh tương đối (RS) / Momentum.
 */
import { OHLCV, calculateRateOfChange, assignRelativeStrengthRank } from '../market-data/indicators';

export interface TickerData {
    ticker: string;
    bars: OHLCV[];
}

export class RankingModule {
    /**
     * Tính toán điểm RS 3 tháng (63 bars) cho toàn bộ Universe và trả về top N cổ phiếu mạnh nhất tại một ngày cụ thể
     */
    static getTopRelativeStrength(universe: TickerData[], targetDate: string, topN: number = 10, period: number = 63): string[] {
        const rocMap: Record<string, number> = {};

        for (const item of universe) {
            // Find index of target date
            const idx = item.bars.findIndex(b => b.date === targetDate);
            if (idx >= period) {
                // Calculate ROC manually for speed without creating entire arrays
                const todayClose = item.bars[idx].close;
                const pastClose = item.bars[idx - period].close;

                if (pastClose > 0) {
                    rocMap[item.ticker] = ((todayClose - pastClose) / pastClose) * 100;
                }
            }
        }

        // Rank from 1-99
        const ranks = assignRelativeStrengthRank(rocMap);

        // Sort logic (higher rank = stronger)
        const sortedTickers = Object.keys(ranks).sort((a, b) => ranks[b] - ranks[a]);

        // Return the top N tickers
        return sortedTickers.slice(0, topN);
    }
}
