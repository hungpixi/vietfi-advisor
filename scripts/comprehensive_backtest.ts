import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'fs';
import { queryOHLCV } from '../src/lib/market-data/ohlcv-db';
import { runBacktest } from '../src/lib/market-data/backtest-engine';
import { GURU_STRATEGIES } from '../src/lib/market-data/guru-strategies';

const TICKERS = ["FPT", "VCB", "SSI", "HPG", "MWG"];
const PERIODS = {
    "6M": { from: "2025-10-18", to: "2026-04-18" },
    "1Y": { from: "2025-04-18", to: "2026-04-18" },
    "BearMarket_2022": { from: "2022-04-01", to: "2023-04-01" },
    "All_Time": { from: "2018-01-01", to: "2026-04-18" }
};

function calculateExtraMetrics(trades) {
    let grossProfit = 0;
    let grossLoss = 0;
    let netProfit = 0;
    const sellTrades = trades.filter(t => t.type === 'SELL');
    if (sellTrades.length === 0) return { profitFactor: 0, avgProfitPerTrade: 0 };

    for (const t of sellTrades) {
        if (t.pnl > 0) grossProfit += t.pnl;
        else grossLoss += Math.abs(t.pnl);
        netProfit += t.pnl;
    }
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 999 : 0) : grossProfit / grossLoss;
    const avgProfitPerTrade = netProfit / sellTrades.length;
    return { profitFactor, avgProfitPerTrade };
}

async function main() {
    const rawData = {};
    for (const ticker of TICKERS) {
        rawData[ticker] = { bars: [] };
        try {
            rawData[ticker].bars = await queryOHLCV(ticker, "2018-01-01", "2026-04-18");
        } catch (e) {
            console.error(`Failed to load ${ticker}: ${e.message}`);
        }
    }

    const results = [];

    for (const [guruId, guru] of Object.entries(GURU_STRATEGIES)) {
        for (const [periodName, dates] of Object.entries(PERIODS)) {
            for (const ticker of TICKERS) {
                const allBars = rawData[ticker].bars;
                const bars = allBars.filter(b => b.date >= dates.from && b.date <= dates.to);
                if (bars.length < 50) continue; // skip if not enough data

                // Run With Fees & Slippage assumption (0.003 total)
                const confWithFee = { ...guru.config, tradingFee: 0.003 };
                const resWithFee = runBacktest(bars, confWithFee);

                // Run Without Fees
                const confNoFee = { ...guru.config, tradingFee: 0.0 };
                const resNoFee = runBacktest(bars, confNoFee);

                const extrasFee = calculateExtraMetrics(resWithFee.trades);
                const extrasNoFee = calculateExtraMetrics(resNoFee.trades);

                results.push({
                    strategyId: guruId,
                    strategyLabel: guru.strategyLabel,
                    period: periodName,
                    ticker: ticker,
                    withFee: {
                        ...resWithFee.metrics,
                        ...extrasFee,
                    },
                    noFee: {
                        ...resNoFee.metrics,
                        ...extrasNoFee,
                    }
                });
            }
        }
    }

    fs.writeFileSync('./backtest_results.json', JSON.stringify(results, null, 2));
    console.log("Written backtest results to ./backtest_results.json");
}

main().catch(console.error);
