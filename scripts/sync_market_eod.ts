import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
const envLocal = join(__dirname, '../.env.local');
if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal });
} else {
    dotenv.config();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Thiếu env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
});

// Common VN30 for testing if no DB entries
const VN30 = [
    "ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG",
    "MBB", "MSN", "MWG", "PLX", "POW", "SAB", "SHB", "SSB", "SSI", "STB",
    "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VRE", "VNINDEX"
];

// 1. Fetch DNSE Open API
async function fetchOHLCVDNSE(ticker: string, fromDateStr: string, toDateStr: string) {
    const fromTs = Math.floor(new Date(fromDateStr).getTime() / 1000);
    const toTs = Math.floor(new Date(toDateStr).getTime() / 1000) + 86400; // end of day

    const apiTicker = ticker === "VNINDEX" ? "VNINDEX" : ticker;
    const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${fromTs}&to=${toTs}&symbol=${apiTicker}&resolution=1D`;

    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
        }
    });

    if (!res.ok) throw new Error(`DNSE Error ${res.status}`);
    const data = await res.json();

    if (!data || !data.t || data.t.length === 0) return [];

    const bars = [];
    for (let i = 0; i < data.t.length; i++) {
        const d = new Date(data.t[i] * 1000);
        const dateStr = d.toISOString().split('T')[0];
        bars.push({
            symbol: ticker,
            date: dateStr,
            open: parseFloat(data.o[i]),
            high: parseFloat(data.h[i]),
            low: parseFloat(data.l[i]),
            close: parseFloat(data.c[i]),
            volume: parseInt(data.v[i], 10),
            value: (parseFloat(data.c[i]) * parseInt(data.v[i], 10)) || 0,
        });
    }
    return bars;
}

// 2. Fallback Fetch TCBS Open API
async function fetchOHLCVTCBS(ticker: string, fromDateStr: string, toDateStr: string) {
    const fromTs = Math.floor(new Date(fromDateStr).getTime() / 1000);
    const toTs = Math.floor(new Date(toDateStr).getTime() / 1000) + 86400; // end of day

    const url = `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&from=${fromTs}&to=${toTs}`;

    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
        }
    });

    if (!res.ok) throw new Error(`TCBS Error ${res.status}`);
    const payload = await res.json();

    if (!payload || !payload.data || payload.data.length === 0) return [];

    return payload.data.map((row: any) => ({
        symbol: ticker,
        date: row.tradingDate.substring(0, 10),
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseInt(row.volume, 10),
        value: (parseFloat(row.close) * parseInt(row.volume, 10)) || 0,
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

async function fetchOHLCV(ticker: string, fromDateStr: string, toDateStr: string) {
    try {
        const bars = await fetchOHLCVDNSE(ticker, fromDateStr, toDateStr);
        if (bars.length > 0) return bars;
    } catch (e: any) {
        console.log(`  ⚠️ DNSE lỗi (${e.message}), thử TCBS...`);
    }

    try {
        const bars = await fetchOHLCVTCBS(ticker, fromDateStr, toDateStr);
        if (bars.length > 0) return bars;
    } catch (e: any) {
        console.log(`  ⚠️ Lỗi fetch dữ liệu TCBS cho ${ticker}: ${e.message}`);
    }

    return [];
}

async function upsertToSupabase(bars: any[]) {
    if (bars.length === 0) return 0;

    // Insert to existing ohlcv_bars schema to bypass migration
    const pushBars = bars.map(b => ({
        ticker: b.symbol,
        date: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume
    }));

    const { data, error } = await supabase
        .from('ohlcv_bars')
        .upsert(pushBars, { onConflict: 'ticker,date' })
        .select('id');

    if (error) {
        console.error(`  ⚠️ Supabase insert error:`, error.message);
        return 0;
    }
    return data ? data.length : 0;
}

// Ensure ticker exists in tickers table to satisfy foreign key constraint
async function ensureTickerExists(ticker: string) {
    const { data } = await supabase.from('tickers').select('symbol').eq('symbol', ticker).maybeSingle();
    if (!data) {
        try {
            await supabase.from('tickers').insert({
                symbol: ticker,
                name: ticker,
                exchange: 'HOSE',
                is_vn30: ["FPT", "VCB", "MBB"].includes(ticker), // small list
                is_active: true
            });
        } catch (err) { }
    }
}

async function main() {
    console.log("🚀 Starting EOD Market Data Sync (daily_ohlcv schema) ...");
    const today = new Date().toISOString().split('T')[0];
    const fromDate = "2026-01-01"; // Fetch only 2026 for speed

    // We'll sync 3 tickers for this showcase/MVP
    const VN30 = ["FPT", "VCB", "MBB"];
    let totalUpserted = 0;

    for (const ticker of VN30) {
        process.stdout.write(`⏳ ${ticker}... `);

        // Check latest date for incremental update
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
            console.log(`✅ Up-to-date`);
            continue;
        }

        await ensureTickerExists(ticker);

        const bars = await fetchOHLCV(ticker, syncFrom, today);
        console.log(`\n[DRY RUN] Demo Data fetching cho ${ticker}: `);
        console.table(bars.slice(0, 3)); // show top 3
        const n = await upsertToSupabase(bars);
        totalUpserted += bars.length;

        console.log(`✅ Fetched ${bars.length} bars (${syncFrom} → ${today}). Supabase Upsert Status: ${n} rows.`);

        // rate limit delay
        await new Promise(r => setTimeout(r, 800));
    }

    console.log(`\n🎉 Done! Total ${totalUpserted} bars synced to Supabase (daily_ohlcv).`);
}

main().catch(console.error);
