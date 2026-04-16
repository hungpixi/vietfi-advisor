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
/* eslint-disable @typescript-eslint/no-explicit-any */

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

export interface SilverData {
  silverUsd: number
  silverVnd: number
  changePct: number
  source: string
}

export interface NewsItem {
  title: string
  link: string
  pubDate: string
}

export interface GoldBrandData {
  buy: number
  sell: number
}

export type GoldBrands = Record<string, GoldBrandData>

export interface MacroData {
  gdpYoY: Array<{ period: string; value: number }>
  cpiYoY: Array<{ period: string; value: number }>
  deposit12m: { min: number; max: number; source: string }
}

export interface MarketSnapshot {
  fetchedAt: string   // ISO timestamp
  vnIndex: VnIndexData | null
  goldSjc: GoldData | null
  silver: SilverData | null
  goldBrands?: GoldBrands
  usdVnd: ExchangeRateData | null
  btc: CryptoData | null
  news: NewsItem[]
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
  // Pattern: "TỶ GIÁ: 25.085,00 VND/USD" or "TỶ GIÁ: 25.085 VND" or "TỶ GIÁ... 25.085"
  const m = text.match(/TỶ\s*GIÁ.*?([\d.]+)(?:,00)?\s*VND/i) || text.match(/TỶ\s*GIÁ[:\s]*([\d.]+)/i)
  if (!m) return null

  const raw = m[1]!
  // "25.085" → 25085
  const rate = parseFloat(raw.replace(/\./g, ''))
  if (isNaN(rate) || rate < 20000 || rate > 30000) return null

  return { rate, source: 'SBV (sbv.gov.vn)' }
}

// ── VN-Index ─────────────────────────────────────────────────────────────────

async function fetchWithCache(url: string, options: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const start = Date.now();
    const resp = await fetch(url, { ...options, signal: controller.signal, next: { revalidate: 300, ...((options as any).next || {}) } } as RequestInit)
    return resp;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn(`[crawler] Timeout (${timeoutMs}ms) khi gọi: ${url}`);
    } else {
      console.warn(`[crawler] Lỗi fetch gọi ${url}:`, err.message || err);
    }
    throw err; // Vẫn throw để các hàm fetchSjc, fetchSilver... tự xử lý bằng catch riêng của tụi nó
  } finally {
    clearTimeout(timer)
  }
}

const CAFEF_MSHDATA_URL = 'https://msh-appdata.cafef.vn/rest-api/api/v1/StockMarket'

export async function fetchVnIndex(): Promise<VnIndexData | null> {
  try {
    const resp = await fetchWithCache(CAFEF_MSHDATA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://cafef.vn/',
      },
      // Node fetch on Vercel Edge — SSL verify issue handled by skip
    })

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
    const resp = await fetchWithCache(COINGECKO_BTC_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

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

const GIAVANG_ALL_URL = 'https://giavang.com.vn/wp-json/giavang/v1/all'

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
  const tryGiaVang = async () => {
    try {
      const resp = await fetchWithCache(GIAVANG_ALL_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!resp.ok) return null
      const body = await resp.json() as Record<string, unknown>
      const sjc = body?.sjc as Record<string, unknown> | undefined
      const prices = Array.isArray(sjc?.prices) ? sjc.prices as Array<Record<string, unknown>> : []
      if (prices.length === 0) return null
      const candidate = prices.find((item) =>
        typeof item.name === 'string' && item.name.toLowerCase().includes('vàng sjc'),
      ) || prices[0]
      const sell = candidate?.sell
      if (typeof sell !== 'number' || !Number.isFinite(sell) || sell <= 0) return null
      const goldVnd = Math.round(sell)
      const goldUsd = Math.round((goldVnd / usdVndRate / (37.5 / 31.1035)) * 100) / 100
      const world = body?.world as Record<string, unknown> | undefined
      const worldPct = typeof world?.change_pct === 'number' ? Number(world.change_pct) : null
      return { goldUsd, goldVnd, changePct: worldPct !== null ? worldPct : 0, source: 'giaVang' }
    } catch { return null }
  }

  const tryDoji = async () => {
    try {
      const dojiXml = await fetchWithCache('https://giavang.doji.vn/api/giavang/?api_key=258fbd2a72ce8481089d88c678e9fe4f', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).then(r => r.text())
      const m = dojiXml.match(/<Row Name="SJC.*?" .*?Sell="(.*?)"/i)
      if (!m) return null
      const goldVnd = parseFloat(m[1].replace(/,/g, '')) * 1000000
      if (goldVnd < 10000000) return null
      const goldUsd = Math.round((goldVnd / usdVndRate / (37.5 / 31.1035)) * 100) / 100
      return { goldUsd, goldVnd, changePct: 0, source: 'DOJI (Backup)' }
    } catch { return null }
  }

  return (await tryGiaVang()) || (await tryDoji())
}

// ── Silver ───────────────────────────────────────────────────────────────────

const YAHOO_SILVER_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=2d'

export async function fetchSilver(usdVndRate: number): Promise<SilverData | null> {
  try {
    const resp = await fetchWithCache(YAHOO_SILVER_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }, 4000)

    if (!resp.ok) return null

    const json = await resp.json() as Record<string, unknown>
    const chart = json.chart as Record<string, unknown> | undefined
    const result = Array.isArray(chart?.result) ? (chart.result[0] as Record<string, unknown>) : undefined

    if (!result || !result.meta) return null
    const meta = result.meta as Record<string, unknown>

    const regularMarketPrice = Number(meta.regularMarketPrice)
    const chartPreviousClose = Number(meta.chartPreviousClose || meta.previousClose)

    if (Number.isNaN(regularMarketPrice) || regularMarketPrice <= 0) return null

    const changePct = chartPreviousClose > 0 ? ((regularMarketPrice - chartPreviousClose) / chartPreviousClose) * 100 : 0
    // Quy đổi lượng (tương đối): 1 lượng = 1.20565 troy oz
    const silverVnd = Math.round(regularMarketPrice * usdVndRate * (37.5 / 31.1035))

    return {
      silverUsd: Math.round(regularMarketPrice * 100) / 100,
      silverVnd,
      changePct: Math.round(changePct * 100) / 100,
      source: 'Yahoo Finance (SI=F)',
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
    const resp = await fetchWithCache(SBV_HOMEPAGE, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
    }, 3000)
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
    const resp = await fetchWithCache(OPEN_ER_API, {}, 10_000)
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

// ── News RSS ──────────────────────────────────────────────────────────────────

const NEWS_SOURCES = [
  'https://vnexpress.net/rss/kinh-doanh.rss',
  'https://cafef.vn/thi-truong-chung-khoan.rss'
]

export async function fetchNews(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = []

  await Promise.allSettled(NEWS_SOURCES.map(async (url) => {
    try {
      const resp = await fetchWithCache(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })

      if (!resp.ok) return
      const xml = await resp.text()

      const $ = cheerio.load(xml, { xmlMode: true })

      $('item').slice(0, 10).each((_, el) => {
        const titleRaw = $(el).find('title').text() || ''
        const title = titleRaw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim()
        const linkRaw = $(el).find('link').text() || ''
        const link = linkRaw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim()
        const pubDate = $(el).find('pubDate').text() || ''

        if (title && link) {
          allItems.push({ title, link, pubDate })
        }
      })
    } catch {
      // ignore
    }
  }))

  // Sort by date (desc) if possible, or just return first 20
  return allItems.slice(0, 20)
}

// ── Multi-Brand Gold Crawler ──────────────────────────────────────────────────

export async function fetchMultiBrandGold(): Promise<GoldBrands> {
  const brands: GoldBrands = {}

  // 1. Fetch DOJI XML
  try {
    const dojiXml = await fetchWithCache('https://giavang.doji.vn/api/giavang/?api_key=258fbd2a72ce8481089d88c678e9fe4f', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 600 }
    }).then(r => r.text())

    let dojiSjcBuy = 0, dojiSjcSell = 0
    let dojiRingBuy = 0, dojiRingSell = 0

    const matches = [...dojiXml.matchAll(/<Row Name="(.*?)" .*?Buy="(.*?)" Sell="(.*?)"/g)]
    for (const m of matches) {
      const name = m[1]
      const buy = parseFloat(m[2].replace(/,/g, '')) * 1000000
      const sell = parseFloat(m[3].replace(/,/g, '')) * 1000000

      if (name.includes('SJC') && dojiSjcBuy === 0 && buy > 10000000) {
        dojiSjcBuy = buy; dojiSjcSell = sell
      }
      if ((name.includes('Nhẫn Tròn') || name.includes('9999')) && dojiRingBuy === 0 && buy > 10000000) {
        dojiRingBuy = buy; dojiRingSell = sell
      }
    }
    if (dojiSjcBuy > 0) brands['DOJI_SJC'] = { buy: dojiSjcBuy, sell: dojiSjcSell }
    if (dojiRingBuy > 0) brands['DOJI_NHAN'] = { buy: dojiRingBuy, sell: dojiRingSell }
  } catch { }

  // 2. Fetch from webgia.com (BTMC, PNJ, Mi Hong)
  const fetchWebgia = async (brandCode: string, urlId: string) => {
    try {
      const html = await fetchWithCache(`https://webgia.com/gia-vang/${urlId}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 600 }
      }).then(r => r.text())

      const $ = cheerio.load(html)
      let ringBuy = 0, ringSell = 0
      let sjcBuy = 0, sjcSell = 0

      $('table tbody tr').each((_, el) => {
        const name = $(el).find('td').first().text().trim().toLowerCase()
        const buyStr = $(el).find('td').eq(1).text().replace(/\D/g, '')
        const sellStr = $(el).find('td').eq(2).text().replace(/\D/g, '')
        if (!buyStr) return

        let buy = parseInt(buyStr, 10)
        let sell = parseInt(sellStr, 10)

        // Cố gắng chuẩn hóa về giá 1 lượng (~80,000,000)
        // Nếu giá trị < 10,000,000 -> khả năng là giá 1 chỉ -> nhân 10
        if (buy > 100000 && buy < 10000000) buy *= 10
        if (sell > 100000 && sell < 10000000) sell *= 10

        if (buy < 10000000 || buy > 150000000) return // Bỏ qua nếu giá vô lý

        if ((name.includes('nhẫn') || name.includes('vàng rồng') || name.includes('trơn') || name.includes('9999')) && ringBuy === 0) {
          ringBuy = buy; ringSell = sell
        }
        if (name.includes('sjc') && sjcBuy === 0) {
          sjcBuy = buy; sjcSell = sell
        }
      })

      if (sjcBuy > 0) brands[`${brandCode}_SJC`] = { buy: sjcBuy, sell: sjcSell }
      if (ringBuy > 0) brands[`${brandCode}_NHAN`] = { buy: ringBuy, sell: ringSell }
    } catch { }
  }

  await Promise.allSettled([
    fetchWebgia('BTMC', 'bao-tin-minh-chau'),
    fetchWebgia('PNJ', 'pnj'),
    fetchWebgia('Mi Hồng', 'mi-hong')
  ])

  return brands
}

// ── Main crawler ──────────────────────────────────────────────────────────────

async function generateAiSummary(snapshot: MarketSnapshot): Promise<string | null> {
  if (process.env.DISABLE_GEMINI_SUMMARY === '1' || !process.env.GEMINI_API_KEY) {
    return null
  }

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

  const prompt = `Bạn là chuyên gia phân tích tài chính viết cho CafeF/VnExpress. Phong cách: súc tích, chuyên nghiệp, trung lập.\n\n` +
    `DỮ LIỆU THỊ TRƯỜNG HIỆN TẠI (tuyệt đối không bịa số liệu gốc):\n${dataBlock}\n\n` +
    `Viết TRỰC TIẾP một bài tóm tắt ngắn bằng tiếng Việt gồm 3 đoạn (không dùng list, gạch đầu dòng, không chào hỏi, không thêm prefix "Câu 1:" hay "Đoạn 1:"), với nội dung:\n` +
    `Đoạn 1: Nhận định nhanh về VN-Index và vàng hoặc tỷ giá.\n` +
    `Đoạn 2: Nhận định nhanh về Vĩ mô (GDP/CPI/Lãi suất).\n` +
    `Đoạn 3: Gợi ý hành động hoặc lưu ý cho nhà đầu tư cá nhân.`;

  try {
    const aiText = await Promise.race([
      callGemini(prompt, { maxTokens: 180 }),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('AI summary timeout')), 60000),
      ),
    ])

    let cleaned = aiText.replace(/(\*\*|##|#)/g, '').trim();
    // Xoá các câu "slop" dư thừa của AI ở đầu
    cleaned = cleaned.replace(/^(Dạ,|Vâng,|Dưới đây là|Theo số liệu|Chắc chắn rồi|Để tóm tắt).*?:\s*/i, '');
    return cleaned;
  } catch (error) {
    console.warn('AI summary unavailable, using fallback text', error)
    return null
  }
}

export async function crawlMarketData(): Promise<MarketSnapshot> {
  const fetchedAt = new Date().toISOString()

  // Fetch all data in parallel — exchange rate is now parallel too
  const [vnIndex, goldSjcData, btc, silver, news, goldBrands, usdVnd] = await Promise.all([
    fetchVnIndex(),
    // We pass a default rate or null and handle conversion later or inside
    fetchGoldSjc(25450),
    fetchBtc(),
    fetchSilver(25450),
    fetchNews(),
    fetchMultiBrandGold(),
    fetchExchangeRate()
  ])

  const usdVndRate = usdVnd?.rate ?? 25450

  // Optional: refine gold prices if we got a real exchange rate
  const goldSjc = goldSjcData ? {
    ...goldSjcData,
    goldUsd: Math.round((goldSjcData.goldVnd / usdVndRate / (37.5 / 31.1035)) * 100) / 100
  } : null

  const snapshot: MarketSnapshot = {
    fetchedAt,
    vnIndex,
    goldSjc,
    silver,
    goldBrands,
    usdVnd,
    btc,
    news,
    macro: getMacroData(),
    aiSummary: null,
  }

  // Generate AI summary in non-blocking mode (fallback to null immediately) to keep first response fast.
  if (process.env.DISABLE_GEMINI_SUMMARY !== '1' && process.env.GEMINI_API_KEY) {
    void generateAiSummary(snapshot).then((aiText) => {
      if (aiText) {
        snapshot.aiSummary = aiText
      }
    }).catch(() => {
      // ignore AI failure for primary response path
    })
  }

  return snapshot
}
