const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./backtest_results.json'));

const periods = [...new Set(data.map(d => d.period))];
const strats = [...new Set(data.map(d => d.strategyLabel))];

for (const p of periods) {
    console.log(`\n>>> PERIOD: ${p}`);
    const filtered = data.filter(d => d.period === p);
    const stratScores = {};

    for (const row of filtered) {
        if (!stratScores[row.strategyLabel]) {
            stratScores[row.strategyLabel] = { count: 0, cagrWithFee: 0, cagrNoFee: 0, winRate: 0, maxDd: 0, sharpe: 0, pf: 0, numTrades: 0, bmkCagr: 0 };
        }
        const s = stratScores[row.strategyLabel];
        s.count++;
        s.cagrWithFee += row.withFee.cagr;
        s.cagrNoFee += row.noFee.cagr;
        s.winRate += row.withFee.winRate;
        s.maxDd += row.withFee.maxDrawdown;
        s.sharpe += row.withFee.sharpe;
        s.pf += row.withFee.profitFactor || 0;
        s.numTrades += row.withFee.numTrades;
        s.bmkCagr += row.withFee.benchmarkCagr;
    }

    const sorted = Object.entries(stratScores).map(([k, s]) => {
        const c = s.count || 1;
        return {
            name: k,
            cagr: s.cagrWithFee / c,
            cagrNoFee: s.cagrNoFee / c,
            bmk: s.bmkCagr / c,
            mdd: s.maxDd / c,
            wr: s.winRate / c,
            pf: s.pf / c,
            trades: s.numTrades / c,
            score: (s.cagrWithFee / c) / ((s.maxDd / c) || 1) // return/risk
        };
    }).sort((a, b) => b.score - a.score);

    for (const s of sorted) {
        console.log(`- ${s.name.padEnd(35)}: CAGR=${s.cagr.toFixed(2)}% (NoFee: ${s.cagrNoFee.toFixed(2)}%, BMK: ${s.bmk.toFixed(2)}%) | MDD=${s.mdd.toFixed(2)}% | WR=${s.wr.toFixed(2)}% | PF=${s.pf.toFixed(2)} | Trades=${s.trades.toFixed(1)}`);
    }
}
