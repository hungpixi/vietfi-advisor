import * as dotenv from 'dotenv';
import { MarketDataService } from '../src/lib/application/market-data/data-service';
import { StrategyManager } from '../src/lib/application/strategy-engine/strategy-manager';
import { PullbackUptrendStrategy } from '../src/lib/application/strategy-engine/strategies/pullback-uptrend';
import { VCPBreakoutStrategy } from '../src/lib/application/strategy-engine/strategies/volatility-contraction';
import { ReportModule } from '../src/lib/application/strategy-engine/report-module';

dotenv.config({ path: '.env.local' });

async function test() {
    const mk = new MarketDataService(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '');

    console.log('🔄 Fetching Data from Supabase...');
    const rawBars = await mk.getHistoricalData('FPT', '2020-01-01', '2026-04-18');
    const cleanBars = mk.cleanData(rawBars);
    console.log(`✅ FPT Bars Count: ${cleanBars.length}`);

    if (cleanBars.length < 200) {
        console.error('Not enough data. Please wait for crawler to finish.');
        process.exit(1);
    }

    const manager = new StrategyManager();
    manager.registerStrategy(new PullbackUptrendStrategy());
    manager.registerStrategy(new VCPBreakoutStrategy());

    console.log('🚀 Running Engine...');
    const signals = manager.runAllStrategies('FPT', cleanBars);

    for (const [sName, sigs] of Object.entries(signals)) {
        const report = ReportModule.generateReport(sName, 'FPT', cleanBars, sigs);
        console.log('\n==========================');
        console.log('Strategy:', sName);
        console.log('Total Trades:', report.totalTrades);
        console.log('Winrate:', report.winRate + '%');
        console.log('Total Return:', report.totalReturnPct + '%');
        console.log('Max Drawdown:', report.maxDrawdownPct + '%');
    }
}

test().catch(console.error);
