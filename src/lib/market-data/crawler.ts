/**
 * Market data crawler for VietFi Advisor.
 *
 * Sources (proven from D:\crawlsbv\vietnam_macro_crawler.py):
 * - VN-Index  → cafef msh-appdata API  (Method 1, no auth)
 * - Gold SJC  → Yahoo Finance GC=F     (convert USD→VND via exchange rate)
 * - USD/VND   → SBV homepage TỶ GIÁ  (cheerio fallback)
 *
 * All fetchers are independent — one failure does NOT block the others.
 * Data is returned even if partial.
 */

import * as cheerio from 'cheerio'

// ── Types ────────────────────────────────────────────────────────────────────

export interface VnIndexData {
  price: number
  change: number
  changePct: number
  volume: string        // raw number as string  (e.g. "5000000000")
  gtgdTyVnd?: string   // giá trị giao dịch tỷ VND (e.g. "15000") — optional if not available
  source: string
}

export interface GoldData {
  goldUsd: number
  goldVnd: number    // per tael (lượng), computed if not fetched directly
  changePct: number
  source: string
}

export interface ExchangeRateData {
  rate: number        // VND per 1 USD (e.g. 25085)
  source: string
}

export interface MarketSnapshot {
  fetchedAt: string   // ISO timestamp
  vnIndex: VnIndexData | null
  goldSjc: GoldData | null
  usdVnd: ExchangeRateData | null
}

// ── Utilities ────────────────────────────────────────────────────────────────

/** Sleep helper — always awaited between external calls. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Convert gold price from USD/oz to VND/tael (lượng).
 * Formula: gold_usd × usd_vnd × (37.5 / 31.1035)
 * 37.5g = 1 tael, 31.1035g = 1 troy oz
 */
export function calculateGoldVnd(goldUsd: number, usdVndRate: number): number {
  if (!goldUsd || !usdVndRate) return 0
  return Math.round(goldUsd * usdVndRate * (37.5 / 31.1035))
}

/** Parse exchange rate from raw SBV homepage HTML string. */
export function parseSbvExchangeRate(html: string): ExchangeRateData | null {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')

  // Pattern: "TỶ GIÁ: 25.085,00 VND/USD" or "TỶ GIÁ: 25.085 VND"
  const m = text.match(/TỶ\s*GIÁ[:\s]*([\d.]+)/i)
  if (!m) return null

  const raw = m[1]!
  // "25.085" → 25085 (dot = thousand separator in SBV formatting)
  const rate = parseFloat(raw.replace(/\./g, ''))
  if (isNaN(rate) || rate < 20000 || rate > 30000) return null

  return { rate, source: 'SBV (sbv.gov.vn)' }
}

// ── VN-Index ─────────────────────────────────────────────────────────────────

const CAFEF_MSHDATA_URL = 'https://msh-appdata.cafef.vn/rest-api/api/v1/StockMarket'

export async function fetchVnIndex(): Promise<VnIndexData | null> {
  try {
    const resp = await fetch(CAFEF_MSHDATA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://cafef.vn/',
      },
      // Node fetch on Vercel Edge — SSL verify issue handled by skip
    } as RequestInit)

    if (!resp.ok) return null

    const json = await resp.json() as { data?: Record<string, unknown>[] }
    const markets = json.data ?? []
    const hose = markets.find((m) => (m as { id?: string }).id === '1')
    if (!hose) return null

    const h = hose as {
      price?: number
      changePrice?: number
      changePercentPrice?: number
      volume?: number
      value?: number
    }

    const price = h.price ?? 0
    const volume = h.volume ?? 0
    const value = h.value ?? 0

    return {
      price,
      change: h.changePrice ?? 0,
      changePct: h.changePercentPrice ?? 0,
      volume: String(volume),
      gtgdTyVnd: value > 0 ? String(Math.round(value / 1e9)) : '0',
      source: 'msh-appdata.cafef.vn',
    }
  } catch {
    return null
  }
}

// ── Gold SJC ─────────────────────────────────────────────────────────────────

const YFINANCE_GOLD_TICKER = 'GC=F'

export async function fetchGoldSjc(usdVndRate: number): Promise<GoldData | null> {
  try {
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${YFINANCE_GOLD_TICKER}?interval=1d&range=5d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      } as RequestInit,
    )
    if (!resp.ok) return null

    const json = await resp.json() as {
      chart?: { result?: { meta?: { regularMarketPrice?: number } }[] }
    }
    const result = json.chart?.result?.[0]
    const goldUsd = result?.meta?.regularMarketPrice
    if (!goldUsd) return null

    return {
      goldUsd: Math.round(goldUsd * 100) / 100,
      goldVnd: calculateGoldVnd(goldUsd, usdVndRate),
      changePct: 0, // calculated from history if needed
      source: 'Yahoo Finance (GC=F)',
    }
  } catch {
    return null
  }
}

// ── USD/VND ───────────────────────────────────────────────────────────────────

const SBV_HOMEPAGE = 'https://sbv.gov.vn/'
const OPEN_ER_API = 'https://open.er-api.com/v6/latest/USD'

export async function fetchExchangeRate(): Promise<ExchangeRateData | null> {
  // Method 1: SBV homepage
  try {
    const resp = await fetch(SBV_HOMEPAGE, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
    } as RequestInit)
    if (resp.ok) {
      const html = await resp.text()
      const parsed = parseSbvExchangeRate(html)
      if (parsed) return parsed
    }
  } catch {
    // fall through
  }

  // Method 2: open.er-api.com (free, no key)
  try {
    const resp = await fetch(OPEN_ER_API, { timeout: 10_000 } as RequestInit)
    if (resp.ok) {
      const json = await resp.json() as { rates?: { VND?: number } }
      const vnd = json.rates?.VND
      if (vnd && vnd > 20000 && vnd < 30000) {
        return { rate: vnd, source: 'Exchange Rate API (open.er-api.com)' }
      }
    }
  } catch {
    // fall through
  }

  return null
}

// ── Main crawler ──────────────────────────────────────────────────────────────

export async function crawlMarketData(): Promise<MarketSnapshot> {
  const fetchedAt = new Date().toISOString()

  // Fetch exchange rate first — needed for gold VND conversion
  const usdVnd = await fetchExchangeRate()
  const usdVndRate = usdVnd?.rate ?? 25085

  // Fetch all data in parallel
  const [vnIndex, goldSjc] = await Promise.all([
    fetchVnIndex(),
    fetchGoldSjc(usdVndRate),
  ])

  return {
    fetchedAt,
    vnIndex,
    goldSjc,
    usdVnd,
  }
}
