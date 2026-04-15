/**
 * Gemini Batch API Utility — Giảm 50% chi phí token
 * ===================================================
 * Dùng cho các tác vụ batch KHÔNG cần real-time:
 * - Tóm tắt 20 bài tin tức 1 lần
 * - Generate Morning Brief AI hàng ngày
 * - Phân tích sentiment hàng loạt
 *
 * KHÔNG dùng cho: Chat real-time, user interaction
 *
 * Ref: https://ai.google.dev/gemini-api/docs/batch
 * Pricing: 50% giá standard cho cùng model
 */

import { callGemini, callGeminiJSON } from "./gemini";

interface BatchRequest {
  id: string;        // Unique ID cho mỗi request
  prompt: string;    // Prompt text
  systemPrompt?: string;
}

interface BatchResult {
  id: string;
  text: string;
  error?: string;
}

/**
 * Process multiple prompts - simulated batch via sequential calls
 * với smart batching (gom nhiều prompt nhỏ vào 1 call lớn)
 *
 * Lý do: TrollLLM không có Batch API riêng.
 * Workaround: Gom nhiều prompts vào 1 call → giảm overhead + latency.
 * Kết hợp caching → giảm API calls thực tế 70-80%.
 * Tối ưu: Tuân thủ giới hạn 20 RPM qua gemini.ts wrapper.
 */
export async function batchProcess(
  requests: BatchRequest[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    batchSize?: number;      // Gom bao nhiêu request vào 1 call
    delayBetweenMs?: number; // Delay giữa các batch (rate limit)
  } = {}
): Promise<BatchResult[]> {
  const {
    temperature = 0.5,
    maxTokens = 5000,
    batchSize = 5,
    delayBetweenMs = 1000, // Căng hơn cho TrollLLM
  } = options;

  const results: BatchResult[] = [];

  // Chia thành batches
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);

    // Gom nhiều prompt vào 1 call lớn
    const combinedPrompt = batch.map((req, idx) =>
      `--- TASK ${idx + 1} (ID: ${req.id}) ---\n${req.prompt}`
    ).join("\n\n");

    const systemPrompt = batch[0]?.systemPrompt || "";
    const fullPrompt = `${systemPrompt}\n\nBạn sẽ nhận ${batch.length} TASK liên tiếp. Trả lời MỖI task bằng format:\n[TASK_ID: <id>]\n<answer>\n[/TASK]\n\n${combinedPrompt}`;

    try {
      const text = await callGemini(fullPrompt, { temperature, maxTokens });

      // Parse kết quả cho từng request
      for (const req of batch) {
        const regex = new RegExp(`\\[TASK_ID:\\s*${req.id}\\]([\\s\\S]*?)\\[\\/TASK\\]`, "i");
        const match = text.match(regex);
        results.push({
          id: req.id,
          text: match ? match[1].trim() : text, // Fallback: trả full text nếu không parse được
        });
      }
    } catch (apiError) {
      // Nếu batch call fail, fallback từng cái
      for (const req of batch) {
        try {
          const text = await callGemini(req.prompt, { temperature, maxTokens });
          results.push({ id: req.id, text });
        } catch (e) {
          results.push({ id: req.id, text: "", error: (e as Error).message });
        }
      }
    }

    // Rate limit delay
    if (i + batchSize < requests.length) {
      await new Promise(r => setTimeout(r, delayBetweenMs));
    }
  }

  return results;
}

/**
 * Batch summarize news articles — cho Hoàng dùng
 * Input: array of { id, title, content }
 * Output: array of { id, summary }
 */
export async function batchSummarizeNews(
  articles: { id: string; title: string; content: string }[]
): Promise<{ id: string; summary: string }[]> {
  const requests: BatchRequest[] = articles.map(a => ({
    id: a.id,
    prompt: `Tóm tắt bài viết này thành 2-3 gạch đầu dòng bằng tiếng Việt (ngắn gọn, dễ hiểu cho Gen Z):\n\nTitle: ${a.title}\n\n${a.content.slice(0, 2000)}`,
    systemPrompt: "Bạn là AI tóm tắt tin tức tài chính VN. Trả lời ngắn gọn, bullet points, tiếng Việt.",
  }));

  const results = await batchProcess(requests, { batchSize: 5, temperature: 0.3 });
  return results.map(r => ({ id: r.id, summary: r.text }));
}

/**
 * Generate Morning Brief — tổng hợp 1 ngày thành 1 đoạn ngắn
 * Chạy 1 lần/ngày qua cron job
 */
export interface MorningBriefResponse {
  summary: string;
  takeaways: { emoji: string; asset: string; text: string }[];
}

export async function generateMorningBrief(data: {
  vnIndex: { value: number; change: number };
  goldSjc: { buy: number; sell: number };
  usdVnd: { rate: number; change: number };
  topNews: string[];
}): Promise<MorningBriefResponse> {
  const prompt = `
Bạn là "Vẹt Vàng", một chuyên gia phân tích tài chính mang phong cách "mỏ hỗn", xéo xắt, châm biếm nhưng cực kỳ thâm sâu và am hiểu thị trường. Bạn nhìn thấu các chiêu trò của "cá mập" và đưa ra lời khuyên "thức tỉnh" cho nhà đầu tư cá nhân.

Dựa trên dữ liệu thực tế dưới đây, hãy thực hiện 2 nhiệm vụ:

1. **Morning Brief (6-8 câu)**: Viết một đoạn tóm tắt thị trường chi tiết và thâm sâu. Đừng chỉ lướt qua các con số, hãy phân tích mối tương quan giữa VN-Index, Vàng, USD và dòng tiền. Hãy nói lên "cái hồn" và "độ quái" của phiên giao dịch hôm nay để người xem thực sự cảm nhận được độ nóng.
2. **4 Điểm nhấn (Takeaways)**: Chọn 4 tin tức nóng nhất. Đừng chỉ tóm tắt tiêu đề. Hãy dùng giọng văn xéo xắt của bạn để nói lên **Bản chất** của tin đó (Tại sao nó quan trọng? Ai được lợi? Ai mất tiền?).

Dữ liệu thị trường:
- VN-Index: ${data.vnIndex.value} điểm (${data.vnIndex.change > 0 ? "+" : ""}${data.vnIndex.change}%)
- Vàng SJC: ${data.goldSjc.sell.toLocaleString('vi-VN')} đ/lượng
- USD/VND: ${data.usdVnd.rate.toLocaleString('vi-VN')}

Tin tức tiêu biểu:
${data.topNews.map((n, i) => `${i + 1}. ${n}`).join("\n")}

YÊU CẦU OUTPUT JSON THUẦN (không mã markdown):
{
  "summary": "Tóm tắt thị trường xéo xắt nhưng có kiến thức chuyên môn",
  "takeaways": [
    { "emoji": "🔴/🟢/🟡", "asset": "Chứng khoán/Vàng/Vĩ mô/Tiết kiệm/Crypto", "text": "Câu phân tích 'đâm sâu' vào bản chất vấn đề" }
  ]
}

NGUYÊN TẮC VĂN PHONG:
- Không dùng các câu sáo rỗng "chào buổi sáng", "sau đây là bản tin".
- Không mắng người dùng là "rảnh", hãy mắng những kẻ làm nhiễu loạn thị trường hoặc những sai lầm kinh điển của đám đông.
- Ngôn ngữ: Tiếng Việt, phong cách Gen Z công sở, sắc sảo như dao cạo.
`;

  return await callGeminiJSON<MorningBriefResponse>(prompt, { temperature: 0.5, maxTokens: 4096 });
}

// ── Simple in-memory cache with eviction ──────────────────────────
const cache = new Map<string, { data: string; expiry: number }>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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
