import { config } from 'dotenv';
config({ path: '.env.local' });

import { queryOHLCV } from '../src/lib/market-data/ohlcv-db';
import { runBacktest } from '../src/lib/market-data/backtest-engine';
import { GURU_STRATEGIES } from '../src/lib/market-data/guru-strategies';

async function main() {
    const tickers = ["FPT", "VCB", "SSI"];
    const fromDate = "2018-01-01";
    const toDate = new Date().toISOString().slice(0, 10);

    console.log("=== THỬ NGHIỆM CHIẾN LƯỢC TRÊN DỮ LIỆU THẬT ===");

    for (const ticker of tickers) {
        console.log(`\n\n[ ${ticker} ] (${fromDate} -> ${toDate})`);
        let bars;
        try {
            bars = await queryOHLCV(ticker, fromDate, toDate);
            console.log(`Đã load ${bars.length} nến OHLCV.`);
        } catch (e: any) {
            console.log(`ERROR: Khong co data cho ${ticker}: ${e.message}`);
            continue;
        }

        for (const key of Object.keys(GURU_STRATEGIES)) {
            const strategy = GURU_STRATEGIES[key];
            const result = runBacktest(bars, strategy.config);

            console.log(`\n> ${strategy.strategyLabel}`);
            console.log(`  - CAGR: ${result.metrics.cagr.toFixed(2)}%`);
            console.log(`  - Benchmark: ${result.metrics.benchmarkCagr.toFixed(2)}%`);
            console.log(`  - Max Drawdown: ${result.metrics.maxDrawdown.toFixed(2)}%`);
            console.log(`  - Win Rate: ${result.metrics.winRate.toFixed(2)}%`);
            console.log(`  - Sharpe: ${result.metrics.sharpe.toFixed(2)}`);
            console.log(`  - Số lệnh: ${result.metrics.numTrades}`);
            console.log(`  - Tổng fee: ${result.metrics.totalFees.toLocaleString()} VND`);
        }
    }
}

main().catch(console.error);
