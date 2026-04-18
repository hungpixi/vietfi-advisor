/**
 * strategy-manager.ts
 * Core Engine để load Data từ Service và chạy qua các thuật toán Strategy
 */
import { OHLCV } from '../market-data/indicators';

export interface Signal {
    date: string;
    ticker: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    price: number;
    reason: string;
}

export interface Strategy {
    name: string;
    description: string;
    generateSignals(ticker: string, bars: OHLCV[]): Signal[];
}

export class StrategyManager {
    private strategies: Strategy[] = [];

    registerStrategy(strategy: Strategy) {
        this.strategies.push(strategy);
    }

    runAllStrategies(ticker: string, bars: OHLCV[]): Record<string, Signal[]> {
        const results: Record<string, Signal[]> = {};
        for (const strat of this.strategies) {
            results[strat.name] = strat.generateSignals(ticker, bars);
        }
        return results;
    }
}
