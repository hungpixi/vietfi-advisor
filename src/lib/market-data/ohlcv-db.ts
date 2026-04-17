/**
 * ohlcv-db.ts — Supabase helpers cho OHLCV data
 *
 * Table schema:
 *   ohlcv_bars (ticker VARCHAR, date DATE, open/high/low/close NUMERIC, volume BIGINT)
 *   PRIMARY KEY (ticker, date)
 */

import { createClient } from "@supabase/supabase-js";
import type { OHLCVBar } from "./price-history";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side only client (service role — bypass RLS)
function getServerClient() {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    });
}

// ── Read ──

export async function queryOHLCV(
    ticker: string,
    fromDate: string,
    toDate: string
): Promise<OHLCVBar[]> {
    const client = getServerClient();
    const { data, error } = await client
        .from("ohlcv_bars")
        .select("date, open, high, low, close, volume")
        .eq("ticker", ticker.toUpperCase())
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: true });

    if (error) throw new Error(`[ohlcv-db] Query error: ${error.message}`);
    if (!data || data.length === 0) {
        throw new Error(
            `Không có dữ liệu cho "${ticker}" từ ${fromDate} đến ${toDate}. ` +
            `Vui lòng chạy backfill: python scripts/sync_market_data.py ${ticker.toUpperCase()}`
        );
    }

    return data.map((r) => ({
        date: r.date,
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume),
    }));
}

// ── Write (upsert) ──

export async function upsertOHLCV(
    ticker: string,
    bars: OHLCVBar[]
): Promise<number> {
    if (bars.length === 0) return 0;
    const client = getServerClient();

    const rows = bars.map((b) => ({
        ticker: ticker.toUpperCase(),
        date: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
    }));

    const { error, count } = await client
        .from("ohlcv_bars")
        .upsert(rows, { onConflict: "ticker,date" })
        .select("date");

    if (error) throw new Error(`[ohlcv-db] Upsert error: ${error.message}`);
    return count ?? rows.length;
}

// ── Latest date check (for incremental sync) ──

export async function getLatestDate(ticker: string): Promise<string | null> {
    const client = getServerClient();
    const { data } = await client
        .from("ohlcv_bars")
        .select("date")
        .eq("ticker", ticker.toUpperCase())
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data?.date ?? null;
}
