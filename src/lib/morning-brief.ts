import { crawlMarketData, type MarketSnapshot } from '@/lib/market-data/crawler'
import { crawlNews, type NewsArticle } from '@/lib/news/crawler'
import { generateMorningBrief, type MorningBriefResponse } from '@/lib/gemini-batch'
import { getGeminiApiKey } from '@/lib/gemini'

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
  thesis?: string
  marketOverview?: string
  macroContext?: string
  newsSynthesis?: string
  risks?: string[]
  actionItems?: string[]
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
  return articles.slice(0, 4).map((article) => ({
    emoji: sentimentToEmoji(article.sentiment),
    asset: article.asset || article.category || 'Thị trường',
    text: (article.summary || article.title).slice(0, 140),
  }))
}

function normalizeMorningBrief(
  aiRes: MorningBriefResponse,
  _market: MarketSnapshot,
  _articles: NewsArticle[],
  source: 'gemini' | 'heuristic',
): MorningBriefData {
  const now = new Date()

  return {
    date: `Hôm nay, ${now.toLocaleDateString('vi-VN')}`,
    title: 'Morning Brief AI',
    summary: aiRes.summary,
    raw: JSON.stringify(aiRes),
    source,
    takeaways: aiRes.takeaways,
    thesis: aiRes.thesis,
    marketOverview: aiRes.marketOverview,
    macroContext: aiRes.macroContext,
    newsSynthesis: aiRes.newsSynthesis,
    risks: aiRes.risks,
    actionItems: aiRes.actionItems,
  }
}

function buildSimulatedGeminiBrief(marketSnapshot: MarketSnapshot, newsSnapshot: { articles: NewsArticle[] }): MorningBriefData {
  const top = newsSnapshot.articles.slice(0, 4)
  const vnIndex = marketSnapshot.vnIndex?.price || 0
  const vnChange = marketSnapshot.vnIndex?.changePct || 0
  const goldPrice = marketSnapshot.goldSjc?.goldVnd?.toLocaleString('vi-VN') || '---'
  const usdRate = marketSnapshot.usdVnd?.rate || 0
  const macro = marketSnapshot.macro

  const marketOverview = `VN-Index đang ở ${vnIndex.toFixed(2)} điểm với biến động ${vnChange >= 0 ? '+' : ''}${vnChange}%. Vàng SJC neo quanh ${goldPrice} đ/lượng, còn USD/VND ở mức ${usdRate.toLocaleString('vi-VN')}. Đây chưa phải một phiên nói chuyện bằng nến xanh rực rỡ; nó là kiểu thị trường khiến người cầm vị thế quá to phải đi kiểm tra tim mạch.`
  const macroContext = `Bối cảnh vĩ mô vẫn xoay quanh tăng trưởng GDP, lạm phát và mức sinh lời thực của tiền nhàn rỗi. GDP YoY gần nhất là ${macro.gdpYoY[0]?.value ?? '?'}%, CPI YoY gần nhất là ${macro.cpiYoY[0]?.value ?? '?'}%, còn lãi suất tiền gửi 12 tháng nằm trong vùng ${macro.deposit12m.min.toFixed(1)}-${macro.deposit12m.max.toFixed(1)}%. Kết luận thực dụng: tiền phòng thủ vẫn có chỗ đứng, nhưng đừng nhầm nó với một kế hoạch làm giàu.`
  const newsSynthesis = top.length > 0
    ? `Top tin nóng hôm nay xoay quanh ${top.map((item) => item.asset || item.category || 'thị trường').join(', ')}. Mẫu số chung là tâm lý đang bị các headline ngắn hạn kéo qua kéo lại, nên danh mục nào thiếu kỷ luật sẽ dễ bị rung hơn mức cần thiết.`
    : 'Chưa đủ tin nóng để tạo một bức tranh rõ, nên hôm nay ưu tiên kỷ luật danh mục hơn việc đoán đỉnh đoán đáy.'
  const thesis = vnChange >= 0
    ? 'Thị trường đang nghiêng tích cực nhưng chưa đủ lực để coi là xu hướng bền vững.'
    : 'Áp lực điều chỉnh còn hiện diện, nên phòng thủ và chọn lọc là ưu tiên.'
  const summary = [
    `Morning Brief hôm nay cho thấy thị trường đang vận động trong trạng thái ${vnChange >= 0 ? 'hồi phục có chọn lọc' : 'phòng thủ và dò đáy'} chứ chưa phải một pha bùng nổ vô điều kiện.`,
    `VN-Index, vàng SJC và USD/VND đang tạo ra một bối cảnh mà chỉ cần tin tức xấu bật lên là khẩu vị rủi ro của nhà đầu tư cá nhân có thể đổi rất nhanh.`,
    `Nếu bạn đang giữ tiền mặt, hãy coi đó là đạn dự trữ; nếu bạn đang giữ tài sản rủi ro, hãy tự hỏi mình đang đầu tư hay chỉ đang cầu nguyện.`,
  ].join('\n\n')

  return {
    date: `Hôm nay, ${new Date().toLocaleDateString('vi-VN')}`,
    title: 'Morning Brief (Dữ liệu thực)',
    summary,
    raw: JSON.stringify({ summary, thesis, marketOverview, macroContext, newsSynthesis }),
    source: 'heuristic',
    takeaways: formatTakeaways(newsSnapshot.articles),
    thesis,
    marketOverview,
    macroContext,
    newsSynthesis,
    risks: [
      'Biến động VN-Index có thể tăng mạnh nếu tin vĩ mô xấu hơn dự kiến.',
      'Vàng và USD/VND vẫn là hai điểm nóng dễ kéo tâm lý danh mục.',
      'Tin tức ngắn hạn dễ khiến nhà đầu tư mua đuổi hoặc bán tháo.',
    ],
    actionItems: [
      'Rà lại tỷ trọng tiền mặt và tài sản rủi ro ngay sáng nay.',
      'Kiểm tra các vị thế đang lãi mỏng xem có đáng giữ thêm không.',
      'Chỉ mua thêm nếu luận điểm đầu tư vẫn còn nguyên, không phải vì FOMO.',
    ],
  }
}

export async function buildMorningBrief(): Promise<MorningBriefData> {
  const [marketSnapshot, newsSnapshot] = await Promise.all([
    crawlMarketData(),
    crawlNews({ includeContent: false, enableAiReview: false, limitPerSection: 4 }),
  ])

  if (!getGeminiApiKey()) {
    console.warn('[morning-brief] Gemini API key missing, using simulated Gemini brief for smooth demo')
    return buildSimulatedGeminiBrief(marketSnapshot, newsSnapshot)
  }

  try {
    const aiResponse = await generateMorningBrief({
      market: {
        vnIndex: {
          value: marketSnapshot.vnIndex?.price ?? 0,
          change: marketSnapshot.vnIndex?.change ?? 0,
          changePct: marketSnapshot.vnIndex?.changePct ?? 0,
        },
        goldSjc: {
          buy: marketSnapshot.goldSjc?.goldVnd ?? 0,
          sell: marketSnapshot.goldSjc?.goldVnd ?? 0,
          changePct: marketSnapshot.goldSjc?.changePct ?? 0,
        },
        usdVnd: {
          rate: marketSnapshot.usdVnd?.rate ?? 0,
          change: 0,
        },
        macro: marketSnapshot.macro,
      },
      news: newsSnapshot.articles.slice(0, 6).map((article) => ({
        title: article.title,
        summary: (article.summary || article.title).slice(0, 300),
        sentiment: article.sentiment,
        asset: article.asset || article.category || 'Thị trường',
        source: article.source,
      })),
    })

    return normalizeMorningBrief(aiResponse, marketSnapshot, newsSnapshot.articles, 'gemini')
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
