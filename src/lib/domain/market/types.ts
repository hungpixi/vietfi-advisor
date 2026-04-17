/**
 * Market Domain Types
 *
 * Pure data contracts for market domain.
 * No framework, no I/O, no external dependencies.
 * Extracted from src/lib/market-data/crawler.ts
 */

export interface VnIndexData {
    price: number;
    change: number;
    changePct: number;
    volume: string; // raw number as string (e.g. "5000000000")
    gtgdTyVnd?: string; // giá trị giao dịch tỷ VND — optional
    source: string;
}

export interface GoldData {
    goldUsd: number;
    goldVnd: number; // per tael (lượng)
    changePct: number;
    source: string;
}

export interface ExchangeRateData {
    rate: number; // VND per 1 USD
    source: string;
}

export interface CryptoData {
    priceUsd: number;
    changePct24h: number;
    source: string;
}

export interface SilverData {
    silverUsd: number;
    silverVnd: number;
    changePct: number;
    source: string;
}

export interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
}

export interface GoldBrandData {
    buy: number;
    sell: number;
}

export type GoldBrands = Record<string, GoldBrandData>;

export interface MacroData {
    gdpYoY: Array<{ period: string; value: number }>;
    cpiYoY: Array<{ period: string; value: number }>;
    deposit12m: { min: number; max: number; source: string };
}

export interface MarketSnapshot {
    fetchedAt: string; // ISO timestamp
    vnIndex: VnIndexData | null;
    goldSjc: GoldData | null;
    silver: SilverData | null;
    goldBrands?: GoldBrands;
    usdVnd: ExchangeRateData | null;
    btc: CryptoData | null;
    news: NewsItem[];
    macro: MacroData;
    aiSummary?: string | null;
}
