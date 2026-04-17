import { crawlMarketData, type MarketSnapshot } from '@/lib/market-data/crawler'
import { crawlNews, type NewsArticle } from '@/lib/news/crawler'
import { generateMorningBrief, type MorningBriefResponse } from '@/lib/gemini-batch'

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

function normalizeAiMorningBriefResponse(aiRes: unknown, articles: NewsArticle[]): MorningBriefResponse {
  if (typeof aiRes === 'string' && aiRes.trim()) {
    return {
      summary: aiRes.trim().slice(0, 2500),
      takeaways: formatTakeaways(articles),
    }
  }

  if (!aiRes || typeof aiRes !== 'object') {
    throw new Error('Invalid Morning Brief AI payload')
  }

  const raw = aiRes as Partial<MorningBriefResponse>
  if (typeof raw.summary !== 'string' || !raw.summary.trim()) {
    throw new Error('Invalid Morning Brief AI summary')
  }

  const takeaways = Array.isArray(raw.takeaways)
    ? raw.takeaways
      .filter((item): item is MorningBriefTakeaway =>
        Boolean(item)
        && typeof item.emoji === 'string'
        && typeof item.asset === 'string'
        && typeof item.text === 'string',
      )
      .slice(0, 4)
      .map((item) => ({
        emoji: item.emoji.slice(0, 8),
        asset: item.asset.slice(0, 48),
        text: item.text.slice(0, 240),
      }))
    : []

  return {
    summary: raw.summary.trim().slice(0, 2500),
    takeaways: takeaways.length > 0 ? takeaways : formatTakeaways(articles),
  }
}

function normalizeMorningBrief(aiRes: unknown, articles: NewsArticle[], source: 'gemini' | 'heuristic'): MorningBriefData {
  const now = new Date()
  const normalized = normalizeAiMorningBriefResponse(aiRes, articles)
  
  return {
    date: `Hôm nay, ${now.toLocaleDateString('vi-VN')}`,
    title: 'Morning Brief AI',
    summary: normalized.summary,
    raw: JSON.stringify(normalized),
    source,
    takeaways: normalized.takeaways,
  }
}

function buildSimulatedGeminiBrief(marketSnapshot: MarketSnapshot, newsSnapshot: { articles: NewsArticle[] }): MorningBriefData {
  const top = newsSnapshot.articles.slice(0, 4)
  const vnIndex = marketSnapshot.vnIndex?.price || 0;
  const vnChange = marketSnapshot.vnIndex?.changePct || 0;
  const goldPrice = marketSnapshot.goldSjc?.goldVnd?.toLocaleString('vi-VN') || '---';
  
  const moodPrompt = vnChange >= 0 ? "s?c xanh t?ch c?c" : "?p l?c ?i?u ch?nh";
  let promptText = `[Bản tin Dự phòng] Thị trường hôm nay vận động trong ${moodPrompt}, VN-Index hiện đạt ${vnIndex.toFixed(2)} điểm (${vnChange >= 0 ? '+' : ''}${vnChange}%). `;
  
  if (marketSnapshot.goldSjc) {
    promptText += `Giá vàng SJC đang neo ở mức ${goldPrice} đ/lượng. `;
  }

  if (top.length > 0) {
    promptText += `Tin tức đáng chú ý: "${top[0].title}". `;
  }
  
  promptText += "Vẹt Vàng khuyên bạn: Trong lúc AI đang 'bảo trì' não bộ, hãy bám sát danh mục và đừng để cảm xúc dẫn dắt túi tiền!";

  return {
    date: `Hôm nay, ${new Date().toLocaleDateString('vi-VN')}`,
    title: 'Morning Brief (Dữ liệu thực)',
    summary: promptText,
    raw: promptText,
    source: 'heuristic', // Correctly mark as heuristic
    takeaways: formatTakeaways(newsSnapshot.articles),
  }
}

export async function buildMorningBrief(): Promise<MorningBriefData> {
  const [marketSnapshot, newsSnapshot] = await Promise.all([
    crawlMarketData(),
    crawlNews({ includeContent: false, enableAiReview: false, limitPerSection: 4 }),
  ])

  if (!process.env.GEMINI_API_KEY) {
    console.warn('[morning-brief] GEMINI_API_KEY missing, using simulated Gemini brief for smooth demo')
    return buildSimulatedGeminiBrief(marketSnapshot, newsSnapshot)
  }

  const topNewsTitles = newsSnapshot.articles.slice(0, 4).map((item, index) => `${index + 1}. ${item.title}`)

  try {
    const aiResponse = await generateMorningBrief({
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

    return normalizeMorningBrief(aiResponse, newsSnapshot.articles, 'gemini')
  } catch (err) {
    console.error('[morning-brief] Gemini generation failed, using simulated Gemini brief for smooth demo:', err)
    return buildSimulatedGeminiBrief(marketSnapshot, newsSnapshot)
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
