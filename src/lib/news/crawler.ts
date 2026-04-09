import * as cheerio from 'cheerio'
import { callGeminiJSON } from '@/lib/gemini'

export type NewsSentimentLabel = 'bullish' | 'bearish' | 'neutral'

export interface NewsArticle {
  id: string
  category: string
  title: string
  link: string
  published: string
  summary: string
  content: string
  source: string
  sentiment: NewsSentimentLabel
  sentimentScore: number // 0-100
  asset: string
}

export interface NewsSentimentAggregate {
  fetchedAt: string
  totalArticles: number
  sentimentCounts: {
    bullish: number
    bearish: number
    neutral: number
  }
  overallNewsScore: number
  overallZone: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed'
  assetSentiment: Array<{
    asset: string
    score: number
    trend: 'up' | 'down' | 'neutral'
    news: string
    articleCount: number
  }>
  history: Array<{
    date: string
    score: number
  }>
}

export interface NewsSnapshot {
  fetchedAt: string
  articles: NewsArticle[]
  metrics: NewsSentimentAggregate
}

const RSS_CAFEF: Record<string, string> = {
  'Trang chủ': 'https://cafef.vn/home.rss',
  'Chứng khoán': 'https://cafef.vn/thi-truong-chung-khoan.rss',
  'Tài chính - Ngân hàng': 'https://cafef.vn/tai-chinh-ngan-hang.rss',
  'Kinh tế vĩ mô': 'https://cafef.vn/vi-mo-dau-tu.rss',
  'Tài chính quốc tế': 'https://cafef.vn/tai-chinh-quoc-te.rss',
  'Bất động sản': 'https://cafef.vn/bat-dong-san.rss',
  'Doanh nghiệp': 'https://cafef.vn/doanh-nghiep.rss',
  'Kinh tế số': 'https://cafef.vn/kinh-te-so.rss',
  'Thị trường': 'https://cafef.vn/thi-truong.rss',
}

// Weighted: strong signal=2, medium=1, weak=0.5
const POSITIVE_KEYWORDS: Array<{ kw: string; w: number }> = [
  { kw: 'vượt đỉnh', w: 2 }, { kw: 'bứt phá', w: 2 }, { kw: 'bật tăng mạnh', w: 2 },
  { kw: 'tăng vọt', w: 2 }, { kw: 'lập đỉnh', w: 2 }, { kw: 'tăng trưởng', w: 1.5 },
  { kw: 'khởi sắc', w: 1.5 }, { kw: 'hồi phục mạnh', w: 1.5 }, { kw: 'bật tăng', w: 1.5 },
  { kw: 'mua ròng', w: 1.5 }, { kw: 'tăng', w: 1 }, { kw: 'lạc quan', w: 1 },
  { kw: 'tích cực', w: 1 }, { kw: 'hồi phục', w: 1 }, { kw: 'đi lên', w: 1 },
  { kw: 'cải thiện', w: 1 }, { kw: 'vượt kỳ vọng', w: 2 }, { kw: 'lãi suất giảm', w: 1.5 },
  { kw: 'thặng dư', w: 1 }, { kw: 'dòng tiền vào', w: 1.5 }, { kw: 'lợi nhuận tăng', w: 1.5 },
  { kw: 'thu hút dòng tiền', w: 1.5 }, { kw: 'dòng vốn ngoại', w: 1 },
]

const NEGATIVE_KEYWORDS: Array<{ kw: string; w: number }> = [
  { kw: 'lao dốc', w: 2 }, { kw: 'bán tháo', w: 2 }, { kw: 'sụp đổ', w: 2 },
  { kw: 'vỡ nợ', w: 2 }, { kw: 'phá sản', w: 2 }, { kw: 'giảm mạnh', w: 2 },
  { kw: 'giảm sâu', w: 1.5 }, { kw: 'thua lỗ', w: 1.5 }, { kw: 'rủi ro', w: 1 },
  { kw: 'áp lực bán', w: 1.5 }, { kw: 'bán ròng', w: 1.5 }, { kw: 'giảm', w: 1 },
  { kw: 'thận trọng', w: 1 }, { kw: 'tiêu cực', w: 1 }, { kw: 'suy yếu', w: 1 },
  { kw: 'bi quan', w: 1 }, { kw: 'đi xuống', w: 1 }, { kw: 'lạm phát tăng', w: 1.5 },
  { kw: 'xung đột', w: 1 }, { kw: 'bất ổn', w: 1 }, { kw: 'thâm hụt', w: 1 },
  { kw: 'nợ xấu', w: 1.5 }, { kw: 'cảnh báo', w: 0.5 }, { kw: 'suy thoái', w: 2 },
]

const ASSET_KEYWORDS: Array<{ asset: string; patterns: RegExp[] }> = [
  {
    asset: 'Vàng',
    patterns: [/\b(vàng|sjc|nhẫn tròn|tael|lượng)\b/i],
  },
  {
    asset: 'Chứng khoán',
    patterns: [/\b(vn-index|hose|hnx|upcom|cổ phiếu|chứng khoán|khối ngoại)\b/i],
  },
  {
    asset: 'Crypto',
    patterns: [/\b(bitcoin|btc|crypto|ethereum|eth)\b/i],
  },
  {
    asset: 'Tiết kiệm',
    patterns: [/\b(lãi suất|tiền gửi|ngân hàng|huy động)\b/i],
  },
  {
    asset: 'Vĩ mô',
    patterns: [/\b(cpi|gdp|lạm phát|fed|nợ công|thâm hụt|tỷ giá|usd\/vnd|nhnn)\b/i],
  },
]

export interface CrawlNewsOptions {
  limitPerSection?: number
  maxChars?: number
  includeContent?: boolean
  rateLimitPerSec?: number
  feeds?: Record<string, string>
  enableAiReview?: boolean
  aiReviewLimit?: number
}

interface SentimentResult {
  sentiment: NewsSentimentLabel
  score: number
}

const FINANCE_INCLUDE_PATTERNS: RegExp[] = [
  /\b(tài chính|kinh tế|đầu tư|chứng khoán|cổ phiếu|trái phiếu|vn-index|hose|hnx|upcom)\b/i,
  /\b(lãi suất|tín dụng|thanh khoản|lạm phát|cpi|gdp|tỷ giá|usd\/vnd|nhnn|fed)\b/i,
  /\b(vàng|sjc|dầu|hàng hóa|bitcoin|btc|crypto|doanh nghiệp|ngân hàng)\b/i,
]

const NON_FINANCE_EXCLUDE_PATTERNS: RegExp[] = [
  /\b(seo|website|wordpress|plugin|frontend|backend|javascript|typescript|react|next\.js|ai tool)\b/i,
  /\b(game|esports|phim|showbiz|idol|ca sĩ|diễn viên|bóng đá|thể thao|du lịch|ẩm thực|thời trang)\b/i,
  /\b(smartphone|điện thoại|laptop|tablet|camera review|mở hộp|benchmark)\b/i,
]

const ALLOWED_ASSETS = new Set(['Vàng', 'Chứng khoán', 'Crypto', 'Tiết kiệm', 'Vĩ mô'])

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal, next: { revalidate: 300, ...((init as any).next || {}) } } as RequestInit)
  } finally {
    clearTimeout(timer)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeDate(raw: string): string {
  if (!raw) return new Date(0).toISOString() // Epoch 1970 — definitely stale
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return new Date(0).toISOString()
  return dt.toISOString()
}

function stripHtml(text: string): string {
  if (!text) return ''
  const $ = cheerio.load(`<div>${text}</div>`)
  return $('div').text().replace(/\s+/g, ' ').trim()
}

function trimTrailingNoise(text: string): string {
  if (!text) return ''
  const markers = [
    'Copy link',
    'Link bài gốc',
    'Lấy link!',
    'Từ Khóa:',
    'CÙNG CHUYÊN MỤC',
    'XEM theo ngày',
    'Chia sẻ',
  ]

  let result = text
  for (const marker of markers) {
    const idx = result.indexOf(marker)
    if (idx !== -1) {
      result = result.slice(0, idx).trim()
    }
  }
  return result
}

function sanitizeHttpUrl(raw: string): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function inferAsset(text: string): string {
  const normalized = text.toLowerCase()
  for (const entry of ASSET_KEYWORDS) {
    if (entry.patterns.some((p) => p.test(normalized))) {
      return entry.asset
    }
  }
  return 'Vĩ mô'
}

export function isFinanceRelevant(text: string): boolean {
  const normalized = text.toLowerCase()
  const includeMatches = FINANCE_INCLUDE_PATTERNS.some((pattern) => pattern.test(normalized))
  const excludeMatches = NON_FINANCE_EXCLUDE_PATTERNS.some((pattern) => pattern.test(normalized))

  if (includeMatches) return true
  if (excludeMatches) return false
  return false
}

function scoreSentiment(text: string): SentimentResult {
  const normalized = text.toLowerCase()
  let positive = 0
  let negative = 0

  for (const { kw, w } of POSITIVE_KEYWORDS) {
    if (normalized.includes(kw)) positive += w
  }

  for (const { kw, w } of NEGATIVE_KEYWORDS) {
    if (normalized.includes(kw)) negative += w
  }

  // Soft score: wider neutral band, stronger weight effect
  const rawScore = 50 + (positive - negative) * 8
  const score = Math.max(0, Math.min(100, rawScore))

  // Narrow the extremes so heuristic rarely fights AI review
  if (score >= 62) return { sentiment: 'bullish', score }
  if (score <= 38) return { sentiment: 'bearish', score }
  return { sentiment: 'neutral', score }
}


// ─── AI Review — every article, strict market-impact check ───────────────────

interface AiReviewResult {
  sentiment: NewsSentimentLabel
  sentimentScore: number
  asset: string
  isMarketRelevant: boolean
}

async function reviewWithAi(signalText: string, currentAsset: string): Promise<AiReviewResult | null> {
  if (!process.env.GEMINI_API_KEY) return null

  const prompt = [
    'Bạn là chuyên gia phân tích thị trường tài chính Việt Nam.',
    'Nhiệm vụ: đánh giá NGHIÊM NGẶT từng tin — nó có ảnh hưởng đến THỊ TRƯỜNG TÀI CHÍNH VIỆT NAM không?',
    '',
    'CHỈ GIỮ (isMarketRelevant=true) nếu tin trực tiếp liên quan đến:',
    '  • VN-Index, HOSE, HNX, cổ phiếu, chứng khoán, khối ngoại',
    '  • Giá vàng SJC, DOJI, thị trường vàng Việt Nam',
    '  • Tỷ giá USD/VND, lãi suất NHNN, chính sách tiền tệ',
    '  • Vĩ mô VN (GDP, CPI, FDI, xuất nhậ khẩu, nợ công)',
    '  • Crypto Việt Nam / Bitcoin toàn cầu ảnh hưởng VN',
    '  • Bất động sản VN (bong bóng, chính sách, thanh khoản)',
    '  • Ngân hàng VN (nợ xấu, tín dụng, lợi nhuận)',
    '',
    'LOẠI BỎ (isMarketRelevant=false) nếu tin:',
    '  • Thuần túy SEO, marketing, quảng cáo web',
    '  • Giải trí, thể thao, đời sống, ẩm thực, du lịch',
    '  • Công nghệ / smartphone / laptop không liên quan tài chính',
    '  • Sự kiện quốc tế KHÔNG ảnh hưởng trực tiếp thị trường VN',
    '',
    'Sentiment: bullish (tăng/sắc), bearish (giảm/rủi ro), neutral (đi ngang/chờ).',
    'asset: Vàng | Chứng khoán | Crypto | Tiết kiệm | Vĩ mô',
    'sentimentScore [0,100]: mạnh bullish→85, bullish→65, neutral→50, bearish→35, mạnh bearish→15.',
    '',
    'BÀI VIẾT CẦN ĐÁNH GIÁ:',
    signalText.slice(0, 1500),
    '',
    'Trả lời JSON thuần, không markdown:',
    '{"isMarketRelevant":boolean,"sentiment":"bullish|bearish|neutral","sentimentScore":number,"asset":"Vàng|Chứng khoán|Crypto|Tiết kiệm|Vĩ mô"}',
  ].join('\n')

  try {
    const result = await callGeminiJSON<AiReviewResult>(prompt, {
      maxTokens: 1024,
      retries: 2,
      delayMs: 500,
    })

    const sentimentScore = Math.max(0, Math.min(100, Number(result.sentimentScore) || 50))
    const sentiment: NewsSentimentLabel =
      result.sentiment === 'bullish' || result.sentiment === 'bearish' || result.sentiment === 'neutral'
        ? result.sentiment
        : 'neutral'

    return {
      sentiment,
      sentimentScore,
      asset: ALLOWED_ASSETS.has(result.asset) ? result.asset : currentAsset,
      isMarketRelevant: Boolean(result.isMarketRelevant),
    }
  } catch {
    return null
  }
}

export function aggregateNewsSentiment(articles: NewsArticle[], fetchedAt: string): NewsSentimentAggregate {
  const sentimentCounts = {
    bullish: 0,
    bearish: 0,
    neutral: 0,
  }

  for (const article of articles) {
    sentimentCounts[article.sentiment] += 1
  }

  const overallNewsScore =
    articles.length > 0
      ? Math.round(articles.reduce((sum, item) => sum + item.sentimentScore, 0) / articles.length)
      : 50

  const overallZone: NewsSentimentAggregate['overallZone'] =
    overallNewsScore <= 20
      ? 'extreme_fear'
      : overallNewsScore <= 40
      ? 'fear'
      : overallNewsScore <= 60
      ? 'neutral'
      : overallNewsScore <= 80
      ? 'greed'
      : 'extreme_greed'

  const byAsset = new Map<string, NewsArticle[]>()
  for (const article of articles) {
    const list = byAsset.get(article.asset) ?? []
    byAsset.set(article.asset, [...list, article])
  }

  const assetSentiment = Array.from(byAsset.entries())
    .map(([asset, list]) => {
      const score = Math.round(list.reduce((sum, item) => sum + item.sentimentScore, 0) / list.length)
      const trend: 'up' | 'down' | 'neutral' = score >= 58 ? 'up' : score <= 42 ? 'down' : 'neutral'
      return {
        asset,
        score,
        trend,
        news: list[0]?.title ?? '',
        articleCount: list.length,
      }
    })
    .sort((a, b) => b.articleCount - a.articleCount)

  const scoreByDate = new Map<string, number[]>()
  for (const article of articles) {
    const date = article.published.slice(0, 10)
    const curr = scoreByDate.get(date) ?? []
    scoreByDate.set(date, [...curr, article.sentimentScore])
  }

  const history = Array.from(scoreByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
    }))

  return {
    fetchedAt,
    totalArticles: articles.length,
    sentimentCounts,
    overallNewsScore,
    overallZone,
    assetSentiment,
    history,
  }
}

function parseRssItems(xml: string, section: string, limit: number, maxChars: number, includeContent: boolean): NewsArticle[] {
  const $ = cheerio.load(xml, { xml: true })
  const items = $('item').toArray().slice(0, limit)

  return items
    .map((item, idx) => {
      const node = $(item)
      const title = node.find('title').first().text().trim()
      const rawLink = node.find('link').first().text().trim()
      const link = sanitizeHttpUrl(rawLink)
      const rawPubDate = node.find('pubDate').text().trim() || node.find('pubdate').text().trim()
      const published = normalizeDate(rawPubDate)

      const summaryHtml = node.find('description').first().text().trim()
      const contentHtml =
        node.find('content\\:encoded').first().text().trim() ||
        node.find('encoded').first().text().trim() ||
        summaryHtml

      const summary = stripHtml(summaryHtml).slice(0, 320)
      const content = includeContent
        ? trimTrailingNoise(stripHtml(contentHtml)).slice(0, maxChars)
        : ''

      if (!title || !link) return null

      // Filter out stale news (older than 30 days) to prevent "Iran/USA" news hauntings
      const pubDate = new Date(published)
      const now = new Date()
      const daysOld = (now.getTime() - pubDate.getTime()) / (1000 * 3600 * 24)
      if (daysOld > 30) return null

      const source = (() => {
        try {
          return new URL(link).hostname.replace('www.', '')
        } catch {
          return 'cafef.vn'
        }
      })()

      const signalText = `${title} ${summary} ${content}`
      if (!isFinanceRelevant(signalText)) return null

      const sent = scoreSentiment(signalText)

      return {
        id: `vietfi-${link ? encodeURIComponent(link).replace(/[^a-zA-Z0-9]/g, '').slice(-20) : `fallback-${idx}`}`,
        category: section,
        title,
        link,
        published,
        summary,
        content,
        source,
        sentiment: sent.sentiment,
        sentimentScore: sent.score,
        asset: inferAsset(signalText),
      }
    })
    .filter((item): item is NewsArticle => item !== null)
}

export async function crawlNews(options: CrawlNewsOptions = {}): Promise<NewsSnapshot> {
  const {
    limitPerSection = 5,
    maxChars = 10_000,
    includeContent = true,
    rateLimitPerSec = 4,
    feeds = RSS_CAFEF,
    enableAiReview = process.env.ENABLE_NEWS_AI_REVIEW === '1',
    aiReviewLimit = 6,
  } = options

  const interval = rateLimitPerSec > 0 ? Math.ceil(1000 / rateLimitPerSec) : 0
  const articles: NewsArticle[] = []

  // Fetch all feeds concurrently, relies on Next.js Data cache for speed
  await Promise.allSettled(
    Object.entries(feeds).map(async ([section, url]) => {
      try {
        const resp = await fetchWithTimeout(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          },
        } as RequestInit, 8_000)

        if (!resp.ok) return

        const xml = await resp.text()
        const sectionItems = parseRssItems(xml, section, limitPerSection, maxChars, includeContent)
        articles.push(...sectionItems)
      } catch {
        // Keep crawling other sections even when one feed fails.
      }
    })
  )

  articles.sort((a, b) => b.published.localeCompare(a.published))

  // Deduplicate by link — same article in "Trang chủ" + "Chứng khoán" keeps newest only
  {
    const seen = new Set<string>()
    const unique: NewsArticle[] = []
    for (const article of articles) {
      if (!article.link || !seen.has(article.link)) {
        seen.add(article.link)
        unique.push(article)
      }
    }
    articles.length = 0
    articles.push(...unique)
  }

  // AI review: EVERY article checked strictly for market impact
  if (enableAiReview && aiReviewLimit > 0) {
    let reviewed = 0
    const enriched: NewsArticle[] = []

    for (const article of articles) {
      if (reviewed >= aiReviewLimit) break

      const signalText = `${article.title} ${article.summary} ${article.content}`
      const ai = await reviewWithAi(signalText, article.asset)

      if (ai) {
        reviewed += 1
        if (!ai.isMarketRelevant) continue

        enriched.push({
          ...article,
          sentiment: ai.sentiment,
          sentimentScore: ai.sentimentScore,
          asset: ai.asset,
        })
      } else {
        // AI failed — keep heuristic result, don't discard the article
        enriched.push(article)
      }
    }

    articles.length = 0
    articles.push(...enriched)
  }

  const fetchedAt = new Date().toISOString()
  const metrics = aggregateNewsSentiment(articles, fetchedAt)

  return { fetchedAt, articles, metrics }
}
