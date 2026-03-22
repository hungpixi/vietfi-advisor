import { crawlMarketData, type MarketSnapshot } from '@/lib/market-data/crawler'
import { crawlNews, type NewsArticle } from '@/lib/news/crawler'
import { generateMorningBrief } from '@/lib/gemini-batch'

export interface MorningBriefTakeaway {
  emoji: string
  asset: string
  text: string
}

export interface MorningBriefData {
  date: string
  title: string
  summary: string
  raw: string
  source: 'gemini' | 'heuristic'
  takeaways: MorningBriefTakeaway[]
}

interface CacheEntry {
  brief: MorningBriefData
  fetchedAt: number
}

const CACHE_TTL_MS = 15 * 60 * 1000
let cache: CacheEntry | null = null

export function resetMorningBriefCache() {
  cache = null
}

function isCacheFresh() {
  if (!cache) return false
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS
}

function sentimentToEmoji(sentiment: 'bullish' | 'bearish' | 'neutral'): string {
  if (sentiment === 'bullish') return '🟢'
  if (sentiment === 'bearish') return '🔴'
  return '🟡'
}

function formatTakeaways(articles: NewsArticle[]): MorningBriefTakeaway[] {
  const top = articles.slice(0, 4)
  return top.map((article) => ({
    emoji: sentimentToEmoji(article.sentiment),
    asset: article.asset || article.category || 'Thị trường',
    text: (article.summary || article.title).slice(0, 120),
  }))
}

function normalizeMorningBrief(raw: string, market: MarketSnapshot, articles: NewsArticle[], source: 'gemini' | 'heuristic'): MorningBriefData {
  const now = new Date()
  const summary = raw.trim().replace(/\s+/g, ' ').slice(0, 600)

  return {
    date: `Hôm nay, ${now.toLocaleDateString('vi-VN')}`,
    title: 'Morning Brief AI',
    summary: summary || 'Morning Brief đang cập nhật.',
    raw: raw.trim(),
    source,
    takeaways: formatTakeaways(articles),
  }
}

function buildFallbackBrief(marketSnapshot: MarketSnapshot, newsSnapshot: { articles: NewsArticle[] }): MorningBriefData {
  const top = newsSnapshot.articles.slice(0, 4)
  const summary = top.map((item) => item.title).join('. ') || 'Không có tin tức đủ để tạo brief.'

  return {
    date: `Hôm nay, ${new Date().toLocaleDateString('vi-VN')}`,
    title: 'Morning Brief heuristic',
    summary: summary,
    raw: summary,
    source: 'heuristic',
    takeaways: formatTakeaways(newsSnapshot.articles),
  }
}

export async function buildMorningBrief(): Promise<MorningBriefData> {
  const [marketSnapshot, newsSnapshot] = await Promise.all([
    crawlMarketData(),
    crawlNews({ includeContent: false, enableAiReview: false, limitPerSection: 4 }),
  ])

  if (!process.env.GEMINI_API_KEY) {
    console.warn('[morning-brief] GEMINI_API_KEY missing, using heuristic fallback')
    return buildFallbackBrief(marketSnapshot, newsSnapshot)
  }

  const topNewsTitles = newsSnapshot.articles.slice(0, 4).map((item, index) => `${index + 1}. ${item.title}`)

  try {
    const briefText = await generateMorningBrief({
      vnIndex: {
        value: marketSnapshot.vnIndex?.price ?? 0,
        change: marketSnapshot.vnIndex?.changePct ?? 0,
      },
      goldSjc: {
        buy: marketSnapshot.goldSjc?.goldVnd ?? 0,
        sell: marketSnapshot.goldSjc?.goldVnd ?? 0,
      },
      usdVnd: {
        rate: marketSnapshot.usdVnd?.rate ?? 0,
        change: marketSnapshot.usdVnd ? marketSnapshot.usdVnd?.rate * 0.0 : 0,
      },
      topNews: topNewsTitles,
    })

    return normalizeMorningBrief(briefText, marketSnapshot, newsSnapshot.articles, 'gemini')
  } catch (err) {
    console.error('[morning-brief] Gemini generation failed, fallback heuristic:', err)
    return buildFallbackBrief(marketSnapshot, newsSnapshot)
  }
}

export async function refreshMorningBriefCache(): Promise<MorningBriefData> {
  const brief = await buildMorningBrief()
  cache = {
    brief,
    fetchedAt: Date.now(),
  }
  return brief
}

export async function getMorningBriefCached(): Promise<{ brief: MorningBriefData; stale: boolean }> {
  if (cache) {
    if (isCacheFresh()) {
      return { brief: cache.brief, stale: false }
    }

    void refreshMorningBriefCache().catch(() => {
      // Keep stale data on background refresh failure
    })
    return { brief: cache.brief, stale: true }
  }

  const brief = await refreshMorningBriefCache()
  return { brief, stale: false }
}
