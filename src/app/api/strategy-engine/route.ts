import { NextResponse } from 'next/server';
import { MarketDataService } from '@/lib/application/market-data/data-service';
import { StrategyManager } from '@/lib/application/strategy-engine/strategy-manager';
import { PullbackUptrendStrategy } from '@/lib/application/strategy-engine/strategies/pullback-uptrend';
import { VCPBreakoutStrategy } from '@/lib/application/strategy-engine/strategies/volatility-contraction';
import { ReportModule } from '@/lib/application/strategy-engine/report-module';

// Use same env logic
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const marketData = new MarketDataService(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') || 'FPT';
    const fromDate = searchParams.get('from') || '2023-01-01';
    const toDate = searchParams.get('to') || new Date().toISOString().split('T')[0];
    const strategy = searchParams.get('strategy') || 'pullback';

    try {
        // 1. Get raw Market Data
        const rawBars = await marketData.getHistoricalData(ticker, fromDate, toDate);

        // 2. Clean Data
        const cleanBars = marketData.cleanData(rawBars);

        if (cleanBars.length < 50) {
            return NextResponse.json({ error: 'Not enough data for backtesting (requires > 50 days)' }, { status: 400 });
        }

        // 3. Initiate Strategy Engine
        const manager = new StrategyManager();
        if (strategy === 'pullback' || strategy === 'all') {
            manager.registerStrategy(new PullbackUptrendStrategy());
        }
        if (strategy === 'vcp' || strategy === 'all') {
            manager.registerStrategy(new VCPBreakoutStrategy());
        }

        // 4. Run & Generate Signals
        const allSignals = manager.runAllStrategies(ticker, cleanBars);

        // 5. Build Final Report
        const reports = [];
        for (const [stratName, signals] of Object.entries(allSignals)) {
            const report = ReportModule.generateReport(stratName, ticker, cleanBars, signals);
            reports.push(report);
        }

        return NextResponse.json({ success: true, ticker, reports });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
