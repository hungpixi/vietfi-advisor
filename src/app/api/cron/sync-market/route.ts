import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel Cron Config: Maximum execution time 60s for hobby, up to 5min for pro.
// We can set maximum duration for Next.js App Router API Route.
export const maxDuration = 300;

// We sync top liquidity tickers on the fly.
const DEFAULT_VN30 = [
    "ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG",
    "MBB", "MSN", "MWG", "PLX", "POW", "SAB", "SHB", "SSB", "SSI", "STB",
    "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VRE", "VNINDEX"
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
});

// Helper: Fetch DNSE
async function fetchOHLCVDNSE(ticker: string, fromDateStr: string, toDateStr: string) {
    const fromTs = Math.floor(new Date(fromDateStr).getTime() / 1000);
    const toTs = Math.floor(new Date(toDateStr).getTime() / 1000) + 86400; // end of day

    const apiTicker = ticker === "VNINDEX" ? "VNINDEX" : ticker;
    const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${fromTs}&to=${toTs}&symbol=${apiTicker}&resolution=1D`;

    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!res.ok) throw new Error(`DNSE Error ${res.status}`);
    const data = await res.json();

    if (!data || !data.t || data.t.length === 0) return [];

    const bars = [];
    for (let i = 0; i < data.t.length; i++) {
        const d = new Date(data.t[i] * 1000);
        const dateStr = d.toISOString().split('T')[0];
        bars.push({
            ticker: ticker,
            date: dateStr,
            open: parseFloat(data.o[i]),
            high: parseFloat(data.h[i]),
            low: parseFloat(data.l[i]),
            close: parseFloat(data.c[i]),
            volume: parseInt(data.v[i], 10),
        });
    }
    return bars;
}

// Helper: Upsert
async function upsertToSupabase(bars: any[]) {
    if (bars.length === 0) return 0;

    // Deduplicate logic using Map based on ticker-date
    const uniqueMap = new Map();
    bars.forEach(b => {
        const key = `${b.symbol}-${b.date}`;
        uniqueMap.set(key, b);
    });
    const cleanBars = Array.from(uniqueMap.values());

    const pushBars = cleanBars.map(b => ({
        ticker: b.symbol,
        date: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume
    }));

    const { error } = await supabase
        .from('ohlcv_bars')
        .upsert(pushBars, { onConflict: 'ticker,date' });

    if (error) {
        console.error(`Supabase error:`, error.message);
        return 0;
    }
    return pushBars.length;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');

    // Security checks for manual trigger vs Vercel Cron trigger
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (searchParams.get('key') !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const today = new Date().toISOString().split('T')[0];
    const fromDate = "2026-01-01"; // Fallback cutoff date

    try {
        let totalUpserted = 0;
        const processedTickers = [];

        for (const ticker of DEFAULT_VN30) {
            // Find latest date in DB
            const { data: latestRow } = await supabase
                .from('ohlcv_bars')
                .select('date')
                .eq('ticker', ticker)
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();

            let syncFrom = fromDate;
            if (latestRow && latestRow.date) {
                const nextDate = new Date(new Date(latestRow.date).getTime() + 86400000);
                syncFrom = nextDate.toISOString().split('T')[0];
            }

            if (syncFrom > today) {
                continue; // Up to date
            }

            try {
                const bars = await fetchOHLCVDNSE(ticker, syncFrom, today);
                const n = await upsertToSupabase(bars);
                totalUpserted += n;
                processedTickers.push(ticker);
            } catch (err) {
                console.error(`Error processing ${ticker}:`, err);
            }

            // Vercel function timeout prevention hack (await delay if processing chunk size)
            await new Promise(r => setTimeout(r, 200));
        }

        return NextResponse.json({
            success: true,
            upsertedRows: totalUpserted,
            processedTickers
        });

    } catch (error: any) {
        console.error('Market sync failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
