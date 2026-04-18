/**
 * Backtest Domain Types
 *
 * Pure data contracts for the backtest context.
 * No framework, no I/O, no external dependencies.
 * Extracted from src/lib/market-data/backtest-engine.ts
 */

export type Strategy =
    | "buy-and-hold"
    | "sma-cross"
    | "breakout-52w"
    | "ma30w-stage2"
    | "tactical-allocation"
    | "wq-mean-reversion"
    | "wq-vol-breakout";

export interface BacktestConfig {
    strategy: Strategy;
    capital: number;       // VND
    smaFast?: number;      // default 20 periods
    smaSlow?: number;      // default 50 periods
    equityWeight?: number; // default 0.7 (70%)
    cashYield?: number;    // default 0.06 (6% APR)
    tradingFee?: number;   // default 0.002 (0.2%)
    wqLookback?: number;   // default 10 or 20
    wqThreshold?: number;  // signal threshold
}

export interface EquityPoint {
    date: string;
    equity: number;    // portfolio value
    benchmark: number; // buy-and-hold baseline
}

export interface Trade {
    type: "BUY" | "SELL";
    date: string;
    price: number;
    shares: number;
    value: number;
    pnl?: number;    // realized PnL on SELL (VND)
    pnlPct?: number; // realized PnL %
}

export interface BacktestMetrics {
    cagr: number;         // CAGR %
    totalReturn: number;  // total return %
    sharpe: number;       // Sharpe Ratio (annualized, rf=0)
    maxDrawdown: number;  // max drawdown %
    winRate: number;      // % lệnh thắng
    numTrades: number;    // số lệnh khớp
    finalCapital: number; // vốn cuối kỳ (VND)
    totalFees: number;    // tổng phí giao dịch (VND)
    benchmarkCagr: number;
    // Stress Test Metrics
    maxDailyDrop: number;
    maxDailyGain: number;
    winLossRatio: number;
    upDays: number;
    downDays: number;
}

export interface BacktestResult {
    equity: EquityPoint[];
    trades: Trade[];
    metrics: BacktestMetrics;
}
