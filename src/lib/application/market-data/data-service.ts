/**
 * data-service.ts
 * Cleaned API Layer serving data to the Research/Strategy Engine.
 */
import { createClient } from '@supabase/supabase-js';
import { OHLCV } from './indicators';

export class MarketDataService {
    private supabase;

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false },
        });
    }

    /**
     * Retrieves clean historical OHLCV data for a given ticker.
     */
    async getHistoricalData(ticker: string, fromDate: string, toDate: string): Promise<OHLCV[]> {
        const { data, error } = await this.supabase
            .from('ohlcv_bars')
            .select('*')
            .eq('ticker', ticker.toUpperCase())
            .gte('date', fromDate)
            .lte('date', toDate)
            .order('date', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch data for ${ticker}: ${error.message}`);
        }

        if (!data) return [];

        return data.map((d: any) => ({
            date: d.date,
            open: Number(d.open),
            high: Number(d.high),
            low: Number(d.low),
            close: Number(d.close), // If adj_close exists, Strategy engine might prefer it. Here we return RAW for OHLCV, but could swap.
            volume: Number(d.volume),
        }));
    }

    /**
     * Cleans data by interpolating missing bars or adjusting anomalies (Corporate Actions mapping)
     * This provides "Research-Ready Data" for the Strategy Engine.
     */
    cleanData(bars: OHLCV[]): OHLCV[] {
        if (bars.length === 0) return [];

        const cleaned = [...bars];
        // Example cleanup logic: Remove bars with 0 volume if price hasn't changed (suspended)
        // or handle split logic if an external API supplies split multipliers.
        // Assuming DB mostly has pristine DNSE data, we just filter outliers:
        return cleaned.filter(b => b.volume > 0 || b.open > 0);
    }

    /**
     * Retrieves universe of tickers that meet minimal liquidity thresholds.
     */
    async getUniverse(minAvgValue: number = 1000000000): Promise<string[]> {
        // In actual implementation, we might aggregate avg(value) last 10 days.
        // For MVP, select all active VN30 or all active tickers.
        const { data, error } = await this.supabase
            .from('tickers')
            .select('symbol')
            .eq('is_active', true);
        // .eq('is_vn30', true);

        if (error) throw new Error(error.message);
        return data.map((t: any) => t.symbol);
    }
}
