/**
 * report-module.ts
 * Nhận Signal từ Strategy Engine và tính toán các chỉ số thống kê hiệu suất: CAGR, WiRate, Max Drawdown
 */
import { Signal } from './strategy-manager';
import { OHLCV } from '../market-data/indicators';

export interface BacktestReport {
    strategyName: string;
    ticker: string;
    totalTrades: number;
    winRate: number;
    totalReturnPct: number;
    maxDrawdownPct: number;
    signals: Signal[];
}

export class ReportModule {
    static generateReport(strategyName: string, ticker: string, bars: OHLCV[], signals: Signal[]): BacktestReport {
        let wins = 0;
        let losses = 0;
        let currentCapital = 10000; // Starting capital
        const peakCapital = [10000];
        const capitalCurve = [10000];

        let entryPrice = 0;

        for (const sig of signals) {
            if (sig.action === 'BUY') {
                entryPrice = sig.price;
            } else if (sig.action === 'SELL' && entryPrice > 0) {
                const profitPct = (sig.price - entryPrice) / entryPrice;
                if (profitPct > 0) wins++;
                else losses++;

                // Apply trade to capital
                currentCapital = currentCapital * (1 + profitPct);
                capitalCurve.push(currentCapital);

                // Track peak for MDD
                if (currentCapital > peakCapital[0]) {
                    peakCapital[0] = currentCapital;
                }

                entryPrice = 0;
            }
        }

        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const totalReturnPct = ((currentCapital - 10000) / 10000) * 100;

        // Calculate Max Drawdown
        let mdd = 0;
        let peak = capitalCurve[0];
        for (const cap of capitalCurve) {
            if (cap > peak) peak = cap;
            const dd = (peak - cap) / peak;
            if (dd > mdd) mdd = dd;
        }

        return {
            strategyName,
            ticker,
            totalTrades,
            winRate: Number(winRate.toFixed(2)),
            totalReturnPct: Number(totalReturnPct.toFixed(2)),
            maxDrawdownPct: Number((mdd * 100).toFixed(2)),
            signals,
        };
    }
}
