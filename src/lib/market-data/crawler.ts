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
import { createClient } from '@/lib/supabase/server'

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

const FALLBACK_MACRO: MacroData = {
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

export async function getMacroData(): Promise<MacroData> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'macro_data')
      .single()

    if (error || !data) {
      console.warn('Failed to fetch macro_data from settings:', error)
      return FALLBACK_MACRO
    }

    return data.value as MacroData
  } catch (err) {
    console.error('getMacroData error:', err)
    return FALLBACK_MACRO
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
    const requestWithNext = options as RequestInit & { next?: { revalidate?: number } }
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      next: { revalidate: 300, ...(requestWithNext.next ?? {}) },
    } as RequestInit)
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
      const apiKey = process.env.DOJI_API_KEY || '258fbd2a72ce8481089d88c678e9fe4f'
      const dojiXml = await fetchWithCache(`https://giavang.doji.vn/api/giavang/?api_key=${apiKey}`, {
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
    })

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
    })
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

const VNEXPRESS_RSS_URL = 'https://vnexpress.net/rss/kinh-doanh.rss'

export async function fetchNews(): Promise<NewsItem[]> {
  try {
    const resp = await fetchWithCache(VNEXPRESS_RSS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!resp.ok) return []
    const xml = await resp.text()

    const $ = cheerio.load(xml, { xmlMode: true })
    const items: NewsItem[] = []

    $('item').slice(0, 5).each((_, el) => {
      const titleRaw = $(el).find('title').text() || ''
      const title = titleRaw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim()
      const linkRaw = $(el).find('link').text() || ''
      const link = linkRaw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim()
      const pubDate = $(el).find('pubDate').text() || ''

      if (title && link) {
        items.push({ title, link, pubDate })
      }
    })

    return items
  } catch {
    return []
  }
}

// ── Multi-Brand Gold Crawler ──────────────────────────────────────────────────

export async function fetchMultiBrandGold(): Promise<GoldBrands> {
  const brands: GoldBrands = {}

  // 1. Fetch DOJI XML
  try {
    const apiKey = process.env.DOJI_API_KEY || '258fbd2a72ce8481089d88c678e9fe4f'
    const dojiXml = await fetchWithCache(`https://giavang.doji.vn/api/giavang/?api_key=${apiKey}`, {
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

  // Fetch exchange rate first — needed for gold VND conversion
  const usdVnd = await fetchExchangeRate()
  const usdVndRate = usdVnd?.rate ?? 25085

  // Fetch all data in parallel
  const [vnIndex, goldSjc, btc, silver, news, goldBrands, macro] = await Promise.all([
    fetchVnIndex(),
    fetchGoldSjc(usdVndRate),
    fetchBtc(),
    fetchSilver(usdVndRate),
    fetchNews(),
    fetchMultiBrandGold(),
    getMacroData()
  ])

  const snapshot: MarketSnapshot = {
    fetchedAt,
    vnIndex,
    goldSjc,
    silver,
    goldBrands,
    usdVnd,
    btc,
    news,
    macro,
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
