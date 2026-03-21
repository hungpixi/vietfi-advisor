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
import { callGemini } from '@/lib/gemini'

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

export interface CryptoData {
  priceUsd: number
  changePct24h: number
  source: string
}

export interface MacroData {
  gdpYoY: Array<{ period: string; value: number }>
  cpiYoY: Array<{ period: string; value: number }>
  deposit12m: { min: number; max: number; source: string }
}

export interface MarketSnapshot {
  fetchedAt: string   // ISO timestamp
  vnIndex: VnIndexData | null
  goldSjc: GoldData | null
  usdVnd: ExchangeRateData | null
  btc: CryptoData | null
  macro: MacroData
  aiSummary?: string | null
}

export function getMacroData(): MacroData {
  return {
    gdpYoY: [
      { period: '2025', value: 8.02 },
      { period: '2024', value: 7.09 },
      { period: '2023', value: 5.05 },
      { period: 'Q4/2025', value: 8.46 },
    ],
    cpiYoY: [
      { period: '2025', value: 3.31 },
      { period: 'Feb 2026', value: 3.35 },
    ],
    deposit12m: { min: 5.2, max: 7.2, source: 'CafeF (ước tính)' },
  }
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
export async function fetchBtc(): Promise<CryptoData | null> {
  try {
    const resp = await fetch(COINGECKO_BTC_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    } as RequestInit)

    if (!resp.ok) return null

    const json = await resp.json() as Record<string, { usd?: number; usd_24h_change?: number }>
    const btc = json.bitcoin
    if (!btc?.usd) return null

    return {
      priceUsd: Math.round(btc.usd * 100) / 100,
      changePct24h: btc.usd_24h_change ? Math.round(btc.usd_24h_change * 100) / 100 : 0,
      source: 'CoinGecko',
    }
  } catch {
    return null
  }
}
// ── Gold SJC ─────────────────────────────────────────────────────────────────

const GIAVANG_SJC_URL = 'https://giavang.com.vn/wp-json/giavang/v1/chart/vn?tf=1d&type=sjc&price=sell_price'

function normalizeGoldSeries(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const trimmed = value.trim()

    // Try parse as plain JS float first (handles 183116666.6667, 1.23e8, etc.)
    const rawNumber = Number(trimmed.replace(/[\s]/g, ''))
    if (!Number.isNaN(rawNumber) && Number.isFinite(rawNumber)) return rawNumber

    // Vietnamese format: 18.815.882,09 -> 18815882.09
    const vnNormalized = trimmed.replace(/\./g, '').replace(',', '.')
    const vnNumber = Number(vnNormalized)
    if (!Number.isNaN(vnNumber) && Number.isFinite(vnNumber)) return vnNumber

    // Fallback: remove thousands separators and parse
    const fallback = trimmed.replace(/[\s]/g, '').replace(/,/g, '')
    const fallbackNumber = Number(fallback)
    if (!Number.isNaN(fallbackNumber) && Number.isFinite(fallbackNumber)) return fallbackNumber
  }

  return null
}

function parseGiavangGoldPrice(body: unknown): { goldVnd: number; changePct: number } | null {
  if (!body) return null

  interface Point {
    value: number
    timestamp?: number
  }

  const extractPoints = (arr: unknown[]): Point[] => {
    const points: Point[] = []

    for (const item of arr) {
      if (typeof item === 'number') {
        points.push({ value: item })
        continue
      }

      if (Array.isArray(item) && item.length >= 2) {
        const value = normalizeGoldSeries(item[1])
        if (value !== null) {
          const ts = item[0] ? new Date(String(item[0])).getTime() : undefined
          points.push({ value, timestamp: Number.isNaN(ts) ? undefined : ts })
        }
        continue
      }

      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        const value = normalizeGoldSeries(o.close ?? o.sell_price ?? o.price ?? o.value ?? o.y ?? o.c)

        if (value !== null) {
          let ts: number | undefined
          if (o.time && typeof o.time === 'string') {
            const maybe = new Date(o.time).getTime()
            ts = Number.isNaN(maybe) ? undefined : maybe
          }
          points.push({ value, timestamp: ts })
        }
        continue
      }
    }

    return points
  }

  const chooseLatest = (points: Point[]): Point | null => {
    if (points.length === 0) return null

    const withTs = points.filter((p) => p.timestamp !== undefined)
    if (withTs.length > 0) {
      return withTs.reduce((best, p) => (p.timestamp! > best.timestamp! ? p : best))
    }

    return points[points.length - 1]
  }

  let points: Point[] = []

  if (Array.isArray(body)) {
    points = extractPoints(body)
  } else if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>

    if (Array.isArray(obj.data)) points = extractPoints(obj.data)
    else if (Array.isArray(obj.series)) {
      const firstSeries = obj.series[0] as Record<string, unknown> | undefined
      if (firstSeries) {
        if (Array.isArray(firstSeries.data)) points = extractPoints(firstSeries.data)
        else if (Array.isArray(firstSeries.values)) points = extractPoints(firstSeries.values)
      }
    } else if (obj.chart && typeof obj.chart === 'object') {
      const chart = obj.chart as Record<string, unknown>
      if (Array.isArray(chart.series)) {
        const firstSeries = chart.series[0] as Record<string, unknown> | undefined
        if (firstSeries) {
          if (Array.isArray(firstSeries.data)) points = extractPoints(firstSeries.data)
          else if (Array.isArray(firstSeries.values)) points = extractPoints(firstSeries.values)
        }
      }
    }

    if (points.length === 0 && Array.isArray(obj.categories) && Array.isArray(obj.data)) {
      points = extractPoints(obj.data)
    }
  }

  const latestPoint = chooseLatest(points)
  if (!latestPoint) return null

  const latest = latestPoint.value
  if (!latest || latest < 1e6 || latest > 2e8) return null

  let previousPoint: Point | null = null
  if (points.length > 1) {
    const sorted = [...points].sort((a, b) => {
      const aTs = a.timestamp ?? 0
      const bTs = b.timestamp ?? 0
      return aTs - bTs
    })
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] !== latestPoint) {
        previousPoint = sorted[i]
        break
      }
    }
  }

  const previous = previousPoint ? previousPoint.value : null
  const changePct = previous && previous > 0 ? Math.round(((latest - previous) / previous) * 10000) / 100 : 0

  return { goldVnd: Math.round(latest), changePct }
}

export async function fetchGoldSjc(usdVndRate: number): Promise<GoldData | null> {
  // Only use giaVang.com.vn source for SJC gold price
  try {
    const resp = await fetch(GIAVANG_SJC_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    } as RequestInit)

    if (!resp.ok) return null

    const body = await resp.json()
    const parsed = parseGiavangGoldPrice(body)
    if (!parsed) return null

    const goldUsd = Math.round((parsed.goldVnd / usdVndRate / (37.5 / 31.1035)) * 100) / 100

    return {
      goldUsd,
      goldVnd: parsed.goldVnd,
      changePct: parsed.changePct,
      source: 'giaVang API',
    }
  } catch {
    return null
  }
}

// ── Bitcoin (BTC) ─────────────────────────────────────────────────────────────

const COINGECKO_BTC_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'

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

async function generateAiSummary(snapshot: MarketSnapshot): Promise<string | null> {
  const dataBlock = [
    snapshot.vnIndex
      ? `- VN-Index: ${snapshot.vnIndex.price.toFixed(2)} điểm (${snapshot.vnIndex.changePct >= 0 ? '+' : ''}${snapshot.vnIndex.changePct.toFixed(2)}%)`
      : null,
    snapshot.goldSjc
      ? `- Vàng SJC: ${snapshot.goldSjc.goldVnd.toLocaleString('vi-VN')} đ/lượng (${snapshot.goldSjc.changePct >= 0 ? '+' : ''}${snapshot.goldSjc.changePct.toFixed(2)}%)`
      : null,
    snapshot.usdVnd
      ? `- USD/VND: ${snapshot.usdVnd.rate.toLocaleString('vi-VN')}`
      : null,
    `- GDP YoY 2025: ${snapshot.macro.gdpYoY.find((g) => g.period === '2025')?.value ?? '?'}%`,
    `- CPI YoY 2025: ${snapshot.macro.cpiYoY.find((c) => c.period === '2025')?.value ?? '?'}%`,
    `- Lãi suất tiền gửi 12T: ${snapshot.macro.deposit12m.min.toFixed(1)}–${snapshot.macro.deposit12m.max.toFixed(1)}%`,
  ].filter(Boolean).join('\n')

  const prompt = `Bạn là chuyên gia phân tích tài chính viết cho CafeF/VnExpress Kinh tế. Phong cách: súc tích, trung lập, dùng số liệu cụ thể.\n\n` +
    `DỮ LIỆU THỊ TRƯỜNG (chỉ dùng các số liệu này, không suy diễn ngoài):\n${dataBlock}\n\n` +
    `Viết đúng 3 câu bằng tiếng Việt theo cấu trúc sau:\n` +
    `Câu 1 – Thị trường: nhận định VN-Index và vàng/tỷ giá (nếu có).\n` +
    `Câu 2 – Vĩ mô: đánh giá GDP/CPI/lãi suất và xu hướng ngắn hạn.\n` +
    `Câu 3 – Gợi ý: một hành động cụ thể, thực tế cho nhà đầu tư cá nhân.`

  try {
    const aiText = await callGemini(prompt, { temperature: 0.3, maxTokens: 180 })
    return aiText.replace(/\*\*/g, '').trim().replace(/[\r\n]+/g, ' ')
  } catch (error) {
    console.warn('AI summary unavailable, using fallback text', error)
    return null
  }
}

export async function crawlMarketData(): Promise<MarketSnapshot> {
  const fetchedAt = new Date().toISOString()

  // Fetch exchange rate first — needed for gold VND conversion
  const usdVnd = await fetchExchangeRate()
  const usdVndRate = usdVnd?.rate ?? 25085

  // Fetch all data in parallel
  const [vnIndex, goldSjc, btc] = await Promise.all([
    fetchVnIndex(),
    fetchGoldSjc(usdVndRate),
    fetchBtc(),
  ])

  const snapshot: MarketSnapshot = {
    fetchedAt,
    vnIndex,
    goldSjc,
    usdVnd,
    btc,
    macro: getMacroData(),
    aiSummary: null,
  }

  snapshot.aiSummary = await generateAiSummary(snapshot)

  return snapshot
}
