/**
 * VietFi Backtest Engine — TypeScript vectorized
 *
 * Strategies: buy-and-hold | sma-cross | breakout-52w | ma30w-stage2
 * Metrics: CAGR, Sharpe Ratio, Max Drawdown, Win Rate
 */

import type { OHLCVBar } from "./price-history";

// ── Types ──

export type Strategy = "buy-and-hold" | "sma-cross" | "breakout-52w" | "ma30w-stage2" | "tactical-allocation" | "wq-mean-reversion" | "wq-vol-breakout";

export interface BacktestConfig {
    strategy: Strategy;
    capital: number;   // VND
    smaFast?: number;  // default 20 periods
    smaSlow?: number;  // default 50 periods
    equityWeight?: number; // default 0.7 (70%)
    cashYield?: number;    // default 0.06 (6% APR)
    tradingFee?: number;   // default 0.002 (0.2%)
    wqLookback?: number;   // lookback period for WQ alphas
    wqThreshold?: number;  // signal threshold for WQ alphas
}

export interface EquityPoint {
    date: string;
    equity: number;      // portfolio value
    benchmark: number;   // buy-and-hold baseline
}

export interface Trade {
    type: "BUY" | "SELL";
    date: string;
    price: number;
    shares: number;
    value: number;
    pnl?: number;        // realized PnL on SELL (VND)
    pnlPct?: number;     // realized PnL %
}

export interface BacktestMetrics {
    cagr: number;           // CAGR %
    totalReturn: number;    // total return %
    sharpe: number;         // Sharpe Ratio (annualized, rf=0)
    maxDrawdown: number;    // max drawdown %
    winRate: number;        // % lệnh thắng
    numTrades: number;      // số lệnh khớp
    finalCapital: number;   // vốn cuối kỳ (VND)
    totalFees: number;      // tổng phí giao dịch (VND)
    benchmarkCagr: number;  // CAGR của Buy & Hold benchmark
    // Stress Test Metrics
    maxDailyDrop: number;   // giảm max/ngày %
    maxDailyGain: number;   // tăng max/ngày %
    winLossRatio: number;   // tỷ lệ thắng/giảm (magnitude ratio hoặc count ratio)
    upDays: number;         // số ngày tăng
    downDays: number;       // số ngày giảm
}

export interface BacktestResult {
    equity: EquityPoint[];
    trades: Trade[];
    metrics: BacktestMetrics;
}

// ── Math helpers ──

function sma(prices: number[], period: number, idx: number): number | null {
    if (idx < period - 1) return null;
    const slice = prices.slice(idx - period + 1, idx + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
}

function calcCAGR(startCapital: number, endCapital: number, bars: number): number {
    if (bars <= 0 || startCapital <= 0) return 0;
    const years = bars / 252; // daily bars → years
    if (years <= 0) return 0;
    return (Math.pow(endCapital / startCapital, 1 / years) - 1) * 100;
}

function calcSharpe(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance =
        returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    // Annualize: daily → *sqrt(252)
    return (mean / stdDev) * Math.sqrt(252);
}

function calcMaxDrawdown(equityCurve: number[]): number {
    let peak = equityCurve[0] ?? 0;
    let maxDD = 0;
    for (const val of equityCurve) {
        if (val > peak) peak = val;
        const dd = peak > 0 ? ((peak - val) / peak) * 100 : 0;
        if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
}

function computeStressMetrics(bars: OHLCVBar[]) {
    let maxDailyDrop = 0;
    let maxDailyGain = 0;
    let upDays = 0;
    let downDays = 0;
    let sumUp = 0;
    let sumDown = 0;

    for (let i = 1; i < bars.length; i++) {
        const prev = bars[i - 1].close;
        const curr = bars[i].close;
        const pctDiff = ((curr - prev) / prev) * 100;

        if (pctDiff > 0) {
            upDays++;
            sumUp += pctDiff;
            if (pctDiff > maxDailyGain) maxDailyGain = pctDiff;
        } else if (pctDiff < 0) {
            downDays++;
            sumDown += Math.abs(pctDiff);
            if (pctDiff < maxDailyDrop) maxDailyDrop = pctDiff; // it's negative
        }
    }
    const avgUp = upDays > 0 ? sumUp / upDays : 0;
    const avgDown = downDays > 0 ? sumDown / downDays : 0;
    const winLossRatio = avgDown > 0 ? avgUp / avgDown : (upDays > 0 ? 100 : 0);

    return { maxDailyDrop, maxDailyGain, upDays, downDays, winLossRatio };
}

// ── Strategy: Buy and Hold ──

function runBuyAndHold(bars: OHLCVBar[], capital: number, fee: number): BacktestResult {
    if (bars.length === 0) return emptyResult(capital);

    const adjustedPrice = bars[0].close * (1 + fee);
    const shares = Math.floor(capital / adjustedPrice);
    const cost = shares * adjustedPrice;
    const leftover = capital - cost;

    // Default benchmark doesn't have fees to show raw market returns
    const bmShares = Math.floor(capital / bars[0].close);
    const bmLeftover = capital - bmShares * bars[0].close;

    const trades: Trade[] = [
        {
            type: "BUY",
            date: bars[0].date,
            price: adjustedPrice, // UI fix
            shares,
            value: cost, // cost = shares * adjustedPrice
        },
    ];

    const equity: EquityPoint[] = bars.map((bar) => ({
        date: bar.date,
        equity: shares * bar.close + leftover,
        benchmark: bmShares * bar.close + bmLeftover,
    }));

    const finalPrice = bars[bars.length - 1].close;
    const finalCapital = shares * finalPrice * (1 - fee) + leftover;
    const weeklyReturns = equity
        .slice(1)
        .map((p, i) => (p.equity - equity[i].equity) / equity[i].equity);

    const metrics: BacktestMetrics = {
        cagr: calcCAGR(capital, finalCapital, bars.length),
        totalReturn: ((finalCapital - capital) / capital) * 100,
        sharpe: calcSharpe(weeklyReturns),
        maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
        winRate: 100, // buy-and-hold: 1 trade, only sell at end
        numTrades: 1,
        finalCapital,
        totalFees: shares * bars[0].close * fee + shares * finalPrice * fee,
        benchmarkCagr: calcCAGR(capital, (bmShares * finalPrice + bmLeftover), bars.length),
        ...computeStressMetrics(bars),
    };

    return { equity, trades, metrics };
}

// ── Strategy: SMA Crossover ──

function runSmaCross(
    bars: OHLCVBar[],
    capital: number,
    fast: number,
    slow: number,
    fee: number
): BacktestResult {
    if (bars.length < slow) return emptyResult(capital);

    const closes = bars.map((b) => b.close);
    const trades: Trade[] = [];
    const equity: EquityPoint[] = [];

    let cash = capital;
    let shares = 0;
    let buyCost = 0;
    let prevFast: number | null = null;
    let prevSlow: number | null = null;
    const winTrades: boolean[] = [];
    let totalFees = 0;

    // Benchmark: buy-and-hold reference
    const bmShares = Math.floor(capital / closes[0]);
    const bmLeftover = capital - bmShares * closes[0];

    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const curFast = sma(closes, fast, i);
        const curSlow = sma(closes, slow, i);

        // Crossover detection
        if (
            curFast !== null &&
            curSlow !== null &&
            prevFast !== null &&
            prevSlow !== null
        ) {
            // Golden cross: fast crosses above slow → BUY
            if (prevFast <= prevSlow && curFast > curSlow && shares === 0) {
                const adjustedPrice = bar.close * (1 + fee);
                shares = Math.floor(cash / adjustedPrice);
                if (shares > 0) {
                    buyCost = adjustedPrice; // Cost per share
                    const totalCost = shares * adjustedPrice;
                    cash -= totalCost;
                    totalFees += shares * bar.close * fee;
                    trades.push({
                        type: "BUY",
                        date: bar.date,
                        price: adjustedPrice, // UI Fix
                        shares,
                        value: totalCost,
                    });
                }
            }

            // Death cross: fast crosses below slow → SELL
            if (prevFast >= prevSlow && curFast < curSlow && shares > 0) {
                totalFees += shares * bar.close * fee;
                const sellValue = shares * bar.close * (1 - fee);
                const pnl = sellValue - shares * buyCost;
                const pnlPct = (pnl / (shares * buyCost)) * 100;
                winTrades.push(pnl > 0);
                trades.push({
                    type: "SELL",
                    date: bar.date,
                    price: bar.close,
                    shares,
                    value: sellValue,
                    pnl,
                    pnlPct,
                });
                cash += sellValue;
                shares = 0;
                buyCost = 0;
            }
        }

        prevFast = curFast;
        prevSlow = curSlow;

        const portfolioValue = cash + shares * bar.close;
        equity.push({
            date: bar.date,
            equity: portfolioValue,
            benchmark: bmShares * bar.close + bmLeftover,
        });
    }

    const finalCapital = cash + shares * bars[bars.length - 1].close * (1 - fee);
    const weeklyReturns = equity
        .slice(1)
        .map((p, i) => (p.equity - equity[i].equity) / equity[i].equity);

    const winRate =
        winTrades.length > 0
            ? (winTrades.filter(Boolean).length / winTrades.length) * 100
            : 0;

    const metrics: BacktestMetrics = {
        cagr: calcCAGR(capital, finalCapital, bars.length),
        totalReturn: ((finalCapital - capital) / capital) * 100,
        sharpe: calcSharpe(weeklyReturns),
        maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
        winRate,
        numTrades: trades.length,
        finalCapital,
        totalFees,
        benchmarkCagr: calcCAGR(capital, (bmShares * bars[bars.length - 1].close + bmLeftover), bars.length),
        ...computeStressMetrics(bars),
    };

    return { equity, trades, metrics };
}

// ── Empty result helper ──

function emptyResult(capital: number): BacktestResult {
    return {
        equity: [],
        trades: [],
        metrics: {
            cagr: 0,
            totalReturn: 0,
            sharpe: 0,
            maxDrawdown: 0,
            winRate: 0,
            numTrades: 0,
            finalCapital: capital,
            totalFees: 0,
            benchmarkCagr: 0,
            maxDailyDrop: 0,
            maxDailyGain: 0,
            winLossRatio: 0,
            upDays: 0,
            downDays: 0,
        },
    };
}

// ── Strategy: Breakout 52-Week High (Livermore / Darvas) ──

function runBreakout52W(bars: OHLCVBar[], capital: number, fee: number): BacktestResult {
    const breakoutPeriod = 252; // 52 weeks = 252 days
    if (bars.length < breakoutPeriod) return emptyResult(capital);

    const closes = bars.map((b) => b.close);
    const trades: Trade[] = [];
    const equity: EquityPoint[] = [];

    let cash = capital;
    let shares = 0;
    let buyCost = 0;
    let totalFees = 0;
    const stopLossPct = 0.08; // Cắt lỗ tĩnh -8%
    const trailingStopPct = 0.15; // Cắt lỗ động (Trailing) -15% từ đỉnh cao nhất
    let trailingPeak = 0;
    const winTrades: boolean[] = [];

    // Benchmark: buy-and-hold reference
    const bmShares = Math.floor(capital / closes[0]);
    const bmLeftover = capital - bmShares * closes[0];

    for (let i = breakoutPeriod; i < bars.length; i++) {
        const bar = bars[i];
        // Đỉnh 52 tuần trước (không tính bar hiện tại)
        const high52w = Math.max(...closes.slice(i - breakoutPeriod, i));

        // ─ BUY: Giá vượt đỉnh 52 tuần
        if (shares === 0 && bar.close > high52w) {
            const adjustedPrice = bar.close * (1 + fee);
            shares = Math.floor(cash / adjustedPrice);
            if (shares > 0) {
                buyCost = adjustedPrice;
                trailingPeak = bar.close; // Khởi tạo đỉnh trailing
                const totalCost = shares * adjustedPrice;
                cash -= totalCost;
                totalFees += shares * bar.close * fee;
                trades.push({ type: "BUY", date: bar.date, price: adjustedPrice, shares, value: totalCost });
            }
        }

        // ─ SELL: Stop-loss / Trailing Stop / Đảo chiều
        if (shares > 0) {
            trailingPeak = Math.max(trailingPeak, bar.high); // Cập nhật mức cao nhất

            const hardStop = buyCost * (1 - stopLossPct);
            const trailStop = trailingPeak * (1 - trailingStopPct);
            const stopPrice = Math.max(hardStop, trailStop);

            // Check if lowest price of the week/day hits our stop
            if (bar.low <= stopPrice || bar.close < stopPrice) {
                // If it gapped down below stop price on Open, we suffer the gap.
                let fillPrice = bar.open < stopPrice ? bar.open : stopPrice;

                // Add explicit fee explicitly
                totalFees += shares * fillPrice * (fee + 0.005); // 0.5% slippage on emergency stops
                fillPrice = fillPrice * (1 - (fee + 0.005));

                const sellValue = shares * fillPrice;
                const pnl = sellValue - shares * buyCost;
                winTrades.push(pnl > 0);
                trades.push({ type: "SELL", date: bar.date, price: fillPrice, shares, value: sellValue, pnl, pnlPct: (pnl / (shares * buyCost)) * 100 });
                cash += sellValue;
                shares = 0;
                buyCost = 0;
                trailingPeak = 0;
            }
        }

        equity.push({
            date: bar.date,
            equity: cash + shares * bar.close,
            benchmark: bmShares * bar.close + bmLeftover,
        });
    }

    const finalCapital = cash + shares * bars[bars.length - 1].close * (1 - fee);
    const weeklyReturns = equity.slice(1).map((p, i) => (p.equity - equity[i].equity) / equity[i].equity);
    const winRate = winTrades.length > 0 ? (winTrades.filter(Boolean).length / winTrades.length) * 100 : 0;

    return {
        equity,
        trades,
        metrics: {
            cagr: calcCAGR(capital, finalCapital, bars.length),
            totalReturn: ((finalCapital - capital) / capital) * 100,
            sharpe: calcSharpe(weeklyReturns),
            maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
            winRate,
            numTrades: trades.length,
            finalCapital,
            totalFees,
            benchmarkCagr: calcCAGR(capital, (bmShares * bars[bars.length - 1].close + bmLeftover), bars.length),
            ...computeStressMetrics(bars),
        },
    };
}

// ── Strategy: MA30 Week Stage 2 (Weinstein) ──

function runMa30wStage2(bars: OHLCVBar[], capital: number, fee: number): BacktestResult {
    const maPeriod = 150; // 30 weeks = 150 days
    if (bars.length < maPeriod + 5) return emptyResult(capital); // Ensure some buffer

    const closes = bars.map((b) => b.close);
    const trades: Trade[] = [];
    const equity: EquityPoint[] = [];

    let cash = capital;
    let shares = 0;
    let buyCost = 0;
    let totalFees = 0;
    let trailingPeak = 0;
    const trailingStopPct = 0.15; // 15% trailing stop
    const winTrades: boolean[] = [];

    const bmShares = Math.floor(capital / closes[0]);
    const bmLeftover = capital - bmShares * closes[0];

    for (let i = maPeriod; i < bars.length; i++) {
        const bar = bars[i];
        const ma30 = sma(closes, maPeriod, i);
        const ma30prev = sma(closes, maPeriod, i - 1);
        if (ma30 === null || ma30prev === null) continue;

        const isAboveMa = bar.close > ma30;
        const ma30Rising = ma30 > ma30prev;  // MA30 đang hướng lên = Giai đoạn 2
        const prevClose = closes[i - 1];
        const prevAboveMa = prevClose > (ma30prev ?? ma30);

        // BUY: giá vượt MA30 từ dưới lên VÀ MA30 đang hướng lên
        if (shares === 0 && isAboveMa && !prevAboveMa && ma30Rising) {
            const adjustedPrice = bar.close * (1 + fee);
            shares = Math.floor(cash / adjustedPrice);
            if (shares > 0) {
                buyCost = adjustedPrice;
                trailingPeak = bar.close;
                const totalCost = shares * adjustedPrice;
                cash -= totalCost;
                totalFees += shares * bar.close * fee;
                trades.push({ type: "BUY", date: bar.date, price: bar.close, shares, value: totalCost });
            }
        }

        // SELL: giá rơi xuống dưới MA30 VÀ MA30 không còn tăng, HOẶC dính trailing stop
        if (shares > 0) {
            trailingPeak = Math.max(trailingPeak, bar.high);
            const trailStop = trailingPeak * (1 - trailingStopPct);
            const hitTrailingStop = bar.low <= trailStop || bar.close < trailStop;
            const trendBroken = !isAboveMa && !ma30Rising;

            if (trendBroken || hitTrailingStop) {
                let fillPrice = bar.close;
                if (hitTrailingStop && !trendBroken) {
                    fillPrice = bar.open < trailStop ? bar.open : trailStop;
                    fillPrice = fillPrice * (1 - 0.005); // 0.5% slippage on emergency stops
                }

                totalFees += shares * fillPrice * fee;
                const sellValue = shares * fillPrice * (1 - fee);
                const pnl = sellValue - shares * buyCost;
                winTrades.push(pnl > 0);
                trades.push({ type: "SELL", date: bar.date, price: fillPrice, shares, value: sellValue, pnl, pnlPct: (pnl / (shares * buyCost)) * 100 });
                cash += sellValue;
                shares = 0;
                buyCost = 0;
                trailingPeak = 0;
            }
        }

        equity.push({
            date: bar.date,
            equity: cash + shares * bar.close,
            benchmark: bmShares * bar.close + bmLeftover,
        });
    }

    const finalCapital = cash + shares * bars[bars.length - 1].close * (1 - fee);
    const weeklyReturns = equity.slice(1).map((p, i) => (p.equity - equity[i].equity) / equity[i].equity);
    const winRate = winTrades.length > 0 ? (winTrades.filter(Boolean).length / winTrades.length) * 100 : 0;

    return {
        equity,
        trades,
        metrics: {
            cagr: calcCAGR(capital, finalCapital, bars.length),
            totalReturn: ((finalCapital - capital) / capital) * 100,
            sharpe: calcSharpe(weeklyReturns),
            maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
            winRate,
            numTrades: trades.length,
            finalCapital,
            totalFees,
            benchmarkCagr: calcCAGR(capital, (bmShares * bars[bars.length - 1].close + bmLeftover), bars.length),
            ...computeStressMetrics(bars),
        },
    };
}

// ── Strategy: Tactical Asset Allocation (Dynamic Scaling) ──

function runTacticalAllocation(
    bars: OHLCVBar[],
    capital: number,
    equityWeight: number = 0.7,
    cashYield: number = 0.06,
    fee: number = 0.002
): BacktestResult {
    const trendPeriod = 200; // 40 tuần ~ 200 ngày
    if (bars.length < trendPeriod) return emptyResult(capital);

    const closes = bars.map((b) => b.close);
    const trades: Trade[] = [];
    const equity: EquityPoint[] = [];

    let cash = capital;
    let shares = 0;
    let averageCost = 0; // WAC
    let totalFees = 0;
    const winTrades: boolean[] = [];

    const bmShares = Math.floor(capital / closes[0]);
    const bmLeftover = capital - bmShares * closes[0];

    const dailyYield = cashYield / 252; // cash yield is daily now

    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];

        // Sinh lời phần tiền mặt
        if (cash > 0) {
            cash = cash * (1 + dailyYield);
        }

        const ma40 = sma(closes, trendPeriod, i);

        // Bắt đầu giao dịch từ tuần thứ 40
        if (i >= trendPeriod && ma40 !== null) {
            const isBullMarket = bar.close > ma40;
            const currentPortfolioValue = cash + shares * bar.close;

            // Dynamic Allocation: Bull = 70% Equity, Bear = 30% Equity
            const targetWeight = isBullMarket ? equityWeight : 0.3; // 30% phòng thủ thay vì 0%
            const targetEquityValue = currentPortfolioValue * targetWeight;
            const targetShares = Math.floor(targetEquityValue / (bar.close * (1 + fee)));

            // Tái cân bằng (Rebalance) nếu lệch quá 5% hoặc mua mới
            const currentEquityValue = shares * bar.close;
            const deviation = Math.abs(currentEquityValue - targetEquityValue) / currentPortfolioValue;

            if (shares === 0 || deviation > 0.05) {
                const sharesDiff = targetShares - shares;

                // MUA
                if (sharesDiff > 0) {
                    const buyCost = sharesDiff * bar.close * (1 + fee);
                    cash -= buyCost;
                    totalFees += sharesDiff * bar.close * fee;

                    // Tính WAC
                    const totalCostBefore = shares * averageCost;
                    shares = targetShares;
                    averageCost = (totalCostBefore + buyCost) / shares;

                    trades.push({
                        type: "BUY",
                        date: bar.date,
                        price: bar.close * (1 + fee), // UI fix
                        shares: sharesDiff,
                        value: buyCost
                    });
                }
                // BÁN
                else if (sharesDiff < 0) {
                    const sellShares = Math.abs(sharesDiff);
                    const sellValue = sellShares * bar.close * (1 - fee);
                    cash += sellValue;
                    totalFees += sellShares * bar.close * fee;

                    const pnl = sellValue - sellShares * averageCost;
                    const pnlPct = (pnl / (sellShares * averageCost)) * 100;
                    if (pnl > 0) winTrades.push(true);
                    else winTrades.push(false);

                    shares = targetShares;
                    if (shares === 0) averageCost = 0;

                    trades.push({
                        type: "SELL",
                        date: bar.date,
                        price: bar.close,
                        shares: sellShares,
                        value: sellValue,
                        pnl,
                        pnlPct
                    });
                }
            }
        }

        equity.push({
            date: bar.date,
            equity: cash + shares * bar.close,
            benchmark: bmShares * bar.close + bmLeftover,
        });
    }

    const finalCapital = cash + shares * bars[bars.length - 1].close * (1 - fee);
    const weeklyReturns = equity.slice(1).map((p, i) => (p.equity - equity[i].equity) / equity[i].equity);

    const winRate = winTrades.length > 0 ? (winTrades.filter(Boolean).length / winTrades.length) * 100 : 0;

    return {
        equity,
        trades,
        metrics: {
            cagr: calcCAGR(capital, finalCapital, bars.length),
            totalReturn: ((finalCapital - capital) / capital) * 100,
            sharpe: calcSharpe(weeklyReturns),
            maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
            winRate, // Có thể tính winRate vì đã có WAC
            numTrades: trades.length,
            finalCapital,
            totalFees,
            benchmarkCagr: calcCAGR(capital, (bmShares * bars[bars.length - 1].close + bmLeftover), bars.length),
            ...computeStressMetrics(bars),
        },
    };
}

// ── Alpha: WQ Mean Reversion ──

function runWqMeanReversion(bars: OHLCVBar[], capital: number, fee: number, lookback: number, threshold: number): BacktestResult {
    if (bars.length < lookback) return emptyResult(capital);
    const closes = bars.map(b => b.close);
    const trades: Trade[] = [];
    const equity: EquityPoint[] = [];

    let cash = capital;
    let shares = 0;
    let buyCost = 0;
    let totalFees = 0;
    const winTrades: boolean[] = [];

    const bmShares = Math.floor(capital / closes[0]);
    const bmLeftover = capital - bmShares * closes[0];

    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];

        let zScore = null;
        if (i >= lookback - 1) {
            const periodSlice = closes.slice(i - lookback + 1, i + 1);
            const Math_mean = periodSlice.reduce((s, v) => s + v, 0) / lookback;
            const variance = periodSlice.reduce((s, v) => s + Math.pow(v - Math_mean, 2), 0) / (lookback > 1 ? lookback - 1 : 1);
            const std = Math.sqrt(variance);
            if (std !== 0) zScore = (bar.close - Math_mean) / std;
        }

        if (zScore !== null) {
            // Buy condition
            if (shares === 0 && zScore < threshold) {
                const adjustedPrice = bar.close * (1 + fee);
                shares = Math.floor(cash / adjustedPrice);
                if (shares > 0) {
                    buyCost = adjustedPrice;
                    const totalCost = shares * adjustedPrice;
                    cash -= totalCost;
                    totalFees += shares * bar.close * fee;
                    trades.push({ type: "BUY", date: bar.date, price: adjustedPrice, shares, value: totalCost });
                }
            }
            // Sell condition
            else if (shares > 0 && zScore > 0) {
                const sellValue = shares * bar.close * (1 - fee);
                const pnl = sellValue - shares * buyCost;
                winTrades.push(pnl > 0);
                trades.push({
                    type: "SELL",
                    date: bar.date,
                    price: bar.close,
                    shares,
                    value: sellValue,
                    pnl,
                    pnlPct: (pnl / (shares * buyCost)) * 100
                });
                totalFees += shares * bar.close * fee;
                cash += sellValue;
                shares = 0;
                buyCost = 0;
            }
        }

        equity.push({
            date: bar.date,
            equity: cash + shares * bar.close,
            benchmark: bmShares * bar.close + bmLeftover,
        });
    }

    const finalCapital = cash + shares * bars[bars.length - 1].close * (1 - fee);
    const weeklyReturns = equity.slice(1).map((p, i) => (p.equity - equity[i].equity) / equity[i].equity);
    const winRate = winTrades.length > 0 ? (winTrades.filter(Boolean).length / winTrades.length) * 100 : 0;

    return {
        equity, trades,
        metrics: {
            cagr: calcCAGR(capital, finalCapital, bars.length),
            totalReturn: ((finalCapital - capital) / capital) * 100,
            sharpe: calcSharpe(weeklyReturns),
            maxDrawdown: calcMaxDrawdown(equity.map(e => e.equity)),
            winRate, numTrades: trades.length, finalCapital, totalFees,
            benchmarkCagr: calcCAGR(capital, (bmShares * bars[bars.length - 1].close + bmLeftover), bars.length),
            ...computeStressMetrics(bars),
        }
    };
}

// ── Alpha: WQ Volatility Breakout ──

function runWqVolBreakout(bars: OHLCVBar[], capital: number, fee: number, lookback: number, threshold: number): BacktestResult {
    if (bars.length < lookback) return emptyResult(capital);
    const closes = bars.map(b => b.close);
    const volumes = bars.map(b => b.volume);
    const trades: Trade[] = [];
    const equity: EquityPoint[] = [];

    let cash = capital;
    let shares = 0;
    let buyCost = 0;
    let totalFees = 0;
    let daysSinceBuy = 0;
    const maxHoldDays = 10;
    const winTrades: boolean[] = [];

    const bmShares = Math.floor(capital / closes[0]);
    const bmLeftover = capital - bmShares * closes[0];

    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];

        let volRatio = null;
        let priceDelta = null;
        if (i >= lookback) {
            const volSlice = volumes.slice(i - lookback, i);
            const meanVol = volSlice.reduce((s, v) => s + v, 0) / lookback;
            if (meanVol > 0) volRatio = bar.volume / meanVol;
            priceDelta = bar.close - closes[i - 1];
        }

        if (shares === 0 && volRatio !== null && priceDelta !== null) {
            if (volRatio > threshold && priceDelta > 0) {
                const adjustedPrice = bar.close * (1 + fee);
                shares = Math.floor(cash / adjustedPrice);
                if (shares > 0) {
                    buyCost = adjustedPrice;
                    const totalCost = shares * adjustedPrice;
                    cash -= totalCost;
                    totalFees += shares * bar.close * fee;
                    trades.push({ type: "BUY", date: bar.date, price: adjustedPrice, shares, value: totalCost });
                    daysSinceBuy = 0;
                }
            }
        }
        else if (shares > 0) {
            daysSinceBuy++;
            if (bar.close < closes[i - 1] || daysSinceBuy >= maxHoldDays) {
                const sellValue = shares * bar.close * (1 - fee);
                const pnl = sellValue - shares * buyCost;
                winTrades.push(pnl > 0);
                trades.push({
                    type: "SELL",
                    date: bar.date,
                    price: bar.close,
                    shares,
                    value: sellValue,
                    pnl,
                    pnlPct: (pnl / (shares * buyCost)) * 100
                });
                totalFees += shares * bar.close * fee;
                cash += sellValue;
                shares = 0;
                buyCost = 0;
            }
        }

        equity.push({
            date: bar.date,
            equity: cash + shares * bar.close,
            benchmark: bmShares * bar.close + bmLeftover,
        });
    }

    const finalCapital = cash + shares * bars[bars.length - 1].close * (1 - fee);
    const weeklyReturns = equity.slice(1).map((p, i) => (p.equity - equity[i].equity) / equity[i].equity);
    const winRate = winTrades.length > 0 ? (winTrades.filter(Boolean).length / winTrades.length) * 100 : 0;

    return {
        equity, trades,
        metrics: {
            cagr: calcCAGR(capital, finalCapital, bars.length),
            totalReturn: ((finalCapital - capital) / capital) * 100,
            sharpe: calcSharpe(weeklyReturns),
            maxDrawdown: calcMaxDrawdown(equity.map(e => e.equity)),
            winRate, numTrades: trades.length, finalCapital, totalFees,
            benchmarkCagr: calcCAGR(capital, (bmShares * bars[bars.length - 1].close + bmLeftover), bars.length),
            ...computeStressMetrics(bars),
        }
    };
}

// ── Main export ──

export function runBacktest(bars: OHLCVBar[], config: BacktestConfig): BacktestResult {
    const { strategy, capital, smaFast = 20, smaSlow = 50, equityWeight, cashYield, tradingFee = 0.002 } = config;

    switch (strategy) {
        case "buy-and-hold":
            return runBuyAndHold(bars, capital, tradingFee);
        case "sma-cross":
            return runSmaCross(bars, capital, smaFast, smaSlow, tradingFee);
        case "breakout-52w":
            return runBreakout52W(bars, capital, tradingFee);
        case "ma30w-stage2":
            return runMa30wStage2(bars, capital, tradingFee);
        case "tactical-allocation":
            return runTacticalAllocation(bars, capital, equityWeight, cashYield, tradingFee);
        case "wq-mean-reversion":
            return runWqMeanReversion(bars, capital, tradingFee, config.wqLookback || 20, config.wqThreshold || -2);
        case "wq-vol-breakout":
            return runWqVolBreakout(bars, capital, tradingFee, config.wqLookback || 20, config.wqThreshold || 2);
        default:
            return runBuyAndHold(bars, capital, tradingFee);
    }
}
