/**
 * Gemini batch-style helper for non-realtime AI jobs.
 * Used for news summarization and Morning Brief generation.
 */

import { callGemini, callGeminiJSON } from "./gemini";

interface BatchRequest {
  id: string;
  prompt: string;
  systemPrompt?: string;
}

interface BatchResult {
  id: string;
  text: string;
  error?: string;
}

export async function batchProcess(
  requests: BatchRequest[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    batchSize?: number;
    delayBetweenMs?: number;
  } = {},
): Promise<BatchResult[]> {
  const {
    temperature = 0.5,
    maxTokens = 5000,
    batchSize = 5,
    delayBetweenMs = 1000,
  } = options;

  const results: BatchResult[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const combinedPrompt = batch
      .map((req, idx) => `--- TASK ${idx + 1} (ID: ${req.id}) ---\n${req.prompt}`)
      .join("\n\n");
    const systemPrompt = batch[0]?.systemPrompt || "";
    const fullPrompt = `${systemPrompt}\n\nBạn sẽ nhận ${batch.length} TASK liên tiếp. Trả lời MỖI task bằng format:\n[TASK_ID: <id>]\n<answer>\n[/TASK]\n\n${combinedPrompt}`;

    try {
      const text = await callGemini(fullPrompt, { temperature, maxTokens });

      for (const req of batch) {
        const regex = new RegExp(`\\[TASK_ID:\\s*${req.id}\\]([\\s\\S]*?)\\[\\/TASK\\]`, "i");
        const match = text.match(regex);
        results.push({
          id: req.id,
          text: match ? match[1].trim() : text,
        });
      }
    } catch {
      for (const req of batch) {
        try {
          const text = await callGemini(req.prompt, { temperature, maxTokens });
          results.push({ id: req.id, text });
        } catch (e) {
          results.push({ id: req.id, text: "", error: (e as Error).message });
        }
      }
    }

    if (i + batchSize < requests.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
    }
  }

  return results;
}

export async function batchSummarizeNews(
  articles: { id: string; title: string; content: string }[],
): Promise<{ id: string; summary: string }[]> {
  const requests: BatchRequest[] = articles.map((article) => ({
    id: article.id,
    prompt: `Tóm tắt bài viết này thành 2-3 gạch đầu dòng bằng tiếng Việt, ngắn gọn, dễ hiểu cho Gen Z:\n\nTitle: ${article.title}\n\n${article.content.slice(0, 2000)}`,
    systemPrompt: "Bạn là AI tóm tắt tin tức tài chính VN. Trả lời ngắn gọn, bullet points, tiếng Việt.",
  }));

  const results = await batchProcess(requests, { batchSize: 5, temperature: 0.3 });
  return results.map((result) => ({ id: result.id, summary: result.text }));
}

export interface MorningBriefResponse {
  summary: string;
  takeaways: { emoji: string; asset: string; text: string }[];
  thesis?: string;
  marketOverview?: string;
  macroContext?: string;
  newsSynthesis?: string;
  risks?: string[];
  actionItems?: string[];
}

export async function generateMorningBrief(data: {
  market: {
    vnIndex: { value: number; change: number; changePct: number };
    goldSjc: { buy: number; sell: number; changePct: number };
    usdVnd: { rate: number; change: number };
    macro: {
      gdpYoY: Array<{ period: string; value: number }>;
      cpiYoY: Array<{ period: string; value: number }>;
      deposit12m: { min: number; max: number; source: string };
    };
  };
  news: {
    title: string;
    summary: string;
    sentiment: "bullish" | "bearish" | "neutral";
    asset: string;
    source: string;
  }[];
}): Promise<MorningBriefResponse> {
  const { market, news } = data;

  const topNewsBlock = news.map((item, index) => {
    const sentimentLabel =
      item.sentiment === "bullish" ? "tích cực" : item.sentiment === "bearish" ? "tiêu cực" : "trung lập";
    return [
      `Tin ${index + 1}: ${item.title}`,
      `- Tóm tắt: ${item.summary}`,
      `- Tài sản: ${item.asset}`,
      `- Tâm lý: ${sentimentLabel}`,
      `- Nguồn: ${item.source}`,
    ].join("\n");
  }).join("\n\n");

  const prompt = `
Bạn là "Vẹt Vàng", một linh vật tài chính cá nhân cho người Việt.
Phong cách: thông minh, xéo xắt, thẳng vào vấn đề, nhưng phải sắc bén và hữu ích.

MỤC TIÊU:
Tạo một Morning Brief dài, giàu chiều sâu, không bị ép ngắn. Đây phải là bản memo buổi sáng dành cho người dùng Việt Nam muốn hiểu thị trường nhanh nhưng vẫn đủ sâu để hành động.

YÊU CẦU NỘI DUNG:
1. \`summary\` là phần executive memo dài, giàu phân tích, có thể nhiều đoạn, không giới hạn chữ theo kiểu viết tắt.
2. \`marketOverview\` tóm lược VN-Index, vàng SJC, USD/VND và tâm lý thị trường.
3. \`macroContext\` nói về GDP, CPI và lãi suất tiền gửi, giải thích ý nghĩa thực dụng cho nhà đầu tư cá nhân.
4. \`newsSynthesis\` tổng hợp các tin nóng thành một câu chuyện chung, nêu tác động tiềm năng lên danh mục và hành vi thị trường.
5. \`risks\` là danh sách 3-5 rủi ro / watchlist ngắn, rõ, thực chiến.
6. \`actionItems\` là danh sách 3-5 việc nên làm ngay trong ngày.
7. \`takeaways\` phải có 4-6 mục, mỗi mục gồm emoji, asset, và câu ngắn sắc lẹm.
8. \`thesis\` nếu cần, viết 1 câu chốt luận điểm thị trường rất gọn.

DATA THỊ TRƯỜNG:
VN-Index: ${market.vnIndex.value} điểm (${market.vnIndex.change > 0 ? "+" : ""}${market.vnIndex.change}%, ${market.vnIndex.changePct > 0 ? "+" : ""}${market.vnIndex.changePct}%)
Vàng SJC: ${market.goldSjc.sell.toLocaleString("vi-VN")} đ/lượng
USD/VND: ${market.usdVnd.rate.toLocaleString("vi-VN")} (${market.usdVnd.change > 0 ? "+" : ""}${market.usdVnd.change})
GDP YoY:
${market.macro.gdpYoY.map((item) => `- ${item.period}: ${item.value}%`).join("\n")}
CPI YoY:
${market.macro.cpiYoY.map((item) => `- ${item.period}: ${item.value}%`).join("\n")}
Lãi suất tiền gửi 12T: ${market.macro.deposit12m.min.toFixed(1)}-${market.macro.deposit12m.max.toFixed(1)}% (${market.macro.deposit12m.source})

TIN TỨC NÓNG:
${topNewsBlock}

YÊU CẦU OUTPUT JSON THUẦN, KHÔNG MARKDOWN, KHÔNG CODE FENCE:
{
  "summary": "Nội dung bản tin dài, nhiều đoạn, giàu phân tích",
  "thesis": "Một câu chốt luận điểm thị trường nếu cần",
  "marketOverview": "Tóm lược thị trường",
  "macroContext": "Bối cảnh vĩ mô",
  "newsSynthesis": "Tổng hợp tin nóng",
  "risks": ["Rủi ro 1", "Rủi ro 2", "Rủi ro 3"],
  "actionItems": ["Việc 1", "Việc 2", "Việc 3"],
  "takeaways": [
    { "emoji": "🔴/🟢/🟡", "asset": "Chứng khoán/Vàng/Vĩ mô/Tiết kiệm/Crypto", "text": "Câu tóm tắt tin tức bằng giọng văn của bạn" }
  ]
}

NGUYÊN TẮC:
- Tuyệt đối không dùng lại nguyên văn tiêu đề báo rác.
- Ưu tiên suy luận và kết nối dữ liệu, không chỉ lặp lại headline.
- Nếu tin tức có vẻ cũ hoặc không liên quan, hãy mắng người dùng một cách duyên dáng.
- Không tự giới hạn độ dài bằng các cụm kiểu "ngắn gọn", "3 câu", "vài dòng". Nếu cần phân tích sâu thì cứ viết sâu.
`;

  const response = await callGeminiJSON<MorningBriefResponse>(prompt, {
    temperature: 0.35,
    maxTokens: 8192,
  });

  return normalizeMorningBriefResponse(response);
}

function normalizeMorningBriefResponse(response: MorningBriefResponse): MorningBriefResponse {
  return {
    summary: normalizeString(response.summary),
    thesis: normalizeOptionalString(response.thesis),
    marketOverview: normalizeOptionalString(response.marketOverview),
    macroContext: normalizeOptionalString(response.macroContext),
    newsSynthesis: normalizeOptionalString(response.newsSynthesis),
    risks: normalizeStringArray(response.risks),
    actionItems: normalizeStringArray(response.actionItems),
    takeaways: Array.isArray(response.takeaways)
      ? response.takeaways
          .map((item) => ({
            emoji: normalizeString(item.emoji),
            asset: normalizeString(item.asset),
            text: normalizeString(item.text),
          }))
          .filter((item) => item.emoji.length > 0 || item.asset.length > 0 || item.text.length > 0)
      : [],
  };
}

function normalizeString(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: string | undefined | null): string | undefined {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringArray(values: string[] | undefined): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const normalized = values.map(normalizeString).filter((item) => item.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

const cache = new Map<string, { data: string; expiry: number }>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function evictExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiry) cache.delete(key);
  }
}

export function getCached(key: string): string | null {
  evictExpired();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key: string, data: string, ttlMs: number = 15 * 60 * 1000) {
  evictExpired();
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}
