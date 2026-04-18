import { NextResponse } from 'next/server';
import { MarketDataService } from '@/lib/application/market-data/data-service';
import { StrategyManager } from '@/lib/application/strategy-engine/strategy-manager';
import { PullbackUptrendStrategy } from '@/lib/application/strategy-engine/strategies/pullback-uptrend';
import { VCPBreakoutStrategy } from '@/lib/application/strategy-engine/strategies/volatility-contraction';

export const maxDuration = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const TELEGRAM_WEBHOOK = process.env.TELEGRAM_WEBHOOK_URL || '';

const marketData = new MarketDataService(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (searchParams.get('key') !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const today = new Date().toISOString().split('T')[0];
    const fromDate = "2024-01-01"; // Require enough history for MA200

    try {
        const universe = await marketData.getUniverse();
        const manager = new StrategyManager();
        manager.registerStrategy(new PullbackUptrendStrategy());
        manager.registerStrategy(new VCPBreakoutStrategy());

        const todaysSignals: any[] = [];

        // Scan the universe
        for (const ticker of universe) {
            const rawBars = await marketData.getHistoricalData(ticker, fromDate, today);
            const cleanBars = marketData.cleanData(rawBars);

            if (cleanBars.length < 200) continue;

            const allSignals = manager.runAllStrategies(ticker, cleanBars);

            for (const [stratName, signals] of Object.entries(allSignals)) {
                if (signals.length > 0) {
                    const lastSignal = signals[signals.length - 1];
                    // Check if the signal was generated today (or the last trading day we just crawled)
                    // For safety, we match the date of the last bar.
                    const lastBar = cleanBars[cleanBars.length - 1];
                    if (lastSignal.date === lastBar.date) {
                        todaysSignals.push({
                            strategy: stratName,
                            ...lastSignal
                        });
                    }
                }
            }
        }

        // ── SEND ALERT ──
        if (todaysSignals.length > 0) {
            let message = `🎯 **KHUYẾN NGHỊ CUỐI NGÀY (${today})** 🎯\n\n`;
            for (const sig of todaysSignals) {
                message += `[${sig.ticker}] ${sig.action === 'BUY' ? '🟢 MUA' : '🔴 BÁN'} giá ${sig.price}\n`;
                message += `Chiến thuật: ${sig.strategy}\n`;
                message += `Lý do: ${sig.reason}\n\n`;
            }

            console.log(message); // Console log it first

            if (TELEGRAM_WEBHOOK) {
                await fetch(TELEGRAM_WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // Telegram usually takes 'chat_id' and 'text', but if this is Discord simply 'content'
                        // We use a generic format, adjust based on endpoint.
                        content: message,
                        text: message
                    })
                });
            }
        }

        return NextResponse.json({
            success: true,
            scanned: universe.length,
            signals: todaysSignals.length,
            data: todaysSignals
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
