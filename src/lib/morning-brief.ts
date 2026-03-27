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

function buildSimulatedGeminiBrief(marketSnapshot: MarketSnapshot, newsSnapshot: { articles: NewsArticle[] }): MorningBriefData {
  const top = newsSnapshot.articles.slice(0, 4)
  const vnIndex = marketSnapshot.vnIndex?.changePct || 0;
  
  let moodPrompt = vnIndex >= 0 ? "sắc xanh tích cực" : "áp lực điều chỉnh";
  let promptText = `Thị trường mở cửa trong ${moodPrompt}, VN-Index biến động ${vnIndex}%. `;
  if (top.length > 0) {
    promptText += `Tâm điểm chú ý hôm nay đổ dồn vào tin tức: "${top[0].title}". `;
  }
  if (top.length > 1) {
    promptText += `Bên cạnh đó, nhóm tin tức xoay quanh "${top[1].title.toLowerCase()}" cũng đang là diễn biến đáng được các nhà đầu tư quan tâm. `;
  }
  promptText += "Khuyến nghị từ Vẹt Vàng: Đừng Fomo lúc này. Hãy quản trị rủi ro chặt chẽ và luôn theo dõi khối lượng giao dịch trước khi đưa ra bất kỳ quyết định giải ngân nào.";

  return {
    date: `Hôm nay, ${new Date().toLocaleDateString('vi-VN')}`,
    title: 'Bản tin sáng AI (Simulated)',
    summary: promptText,
    raw: promptText,
    source: 'gemini', // Fake it till you make it cho demo startup!
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
