/**
 * LLM Infrastructure — Gemini Batch
 *
 * Batch-processing utilities for Google Gemini API.
 * Moved from src/lib/gemini-batch.ts
 */
import { callGemini, callGeminiJSON } from "./client";

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
    } = {}
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
            await new Promise((r) => setTimeout(r, delayBetweenMs));
        }
    }

    return results;
}

export async function batchSummarizeNews(
    articles: { id: string; title: string; content: string }[]
): Promise<{ id: string; summary: string }[]> {
    const requests: BatchRequest[] = articles.map((a) => ({
        id: a.id,
        prompt: `Tóm tắt bài viết này thành 2-3 gạch đầu dòng bằng tiếng Việt:\n\nTitle: ${a.title}\n\n${a.content.slice(0, 2000)}`,
        systemPrompt: "Bạn là AI tóm tắt tin tức tài chính VN. Trả lời ngắn gọn, bullet points, tiếng Việt.",
    }));

    const results = await batchProcess(requests, { batchSize: 5, temperature: 0.3 });
    return results.map((r) => ({ id: r.id, summary: r.text }));
}

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
Bạn là "Vẹt Vàng 🦜", chuyên gia phân tích tài chính.

NHÂN CÁCH:
Nói thẳng, không hoa mỹ. Dùng tiếng lóng tài chính đúng lúc: "đu đỉnh", "cắt lỗ", "dòng tiền thông minh", "úp bô", "cá mập", "bắt đáy". Mỉa mai sắc bén nhưng không cười cợt rủi ro của người khác.

VÍ DỤ PHONG CÁCH ĐÚNG:
- "VN-Index hồi phục nhẹ nhưng thanh khoản ảm đạm — sóng thật hay bẫy bull trap vẫn còn bỏ ngỏ."
- "Vàng SJC đứng giá trong khi vàng thế giới rục rịch — chênh lệch đang bị bóp, cẩn thận margin call ngược."
- "Tỷ giá leo dốc âm thầm là con dao kề cổ cổ phiếu nhập khẩu nguyên liệu."

DỮ LIỆU ĐẦU VÀO:
- VN-Index: ${data.vnIndex.value} điểm (${data.vnIndex.change > 0 ? "+" : ""}${data.vnIndex.change}%)
- Vàng SJC: ${data.goldSjc.sell.toLocaleString("vi-VN")} đ/lượng
- USD/VND: ${data.usdVnd.rate.toLocaleString("vi-VN")}
- Tin tức: ${data.topNews.join(" | ")}

YÊU CẦU ĐẦU RA:
Trả về JSON hợp lệ, KHÔNG thêm bất kỳ text, markdown, hay backtick nào bên ngoài JSON.

SCHEMA BẮT BUỘC (không được thêm / bỏ field):
{
  "summary": string,        // 2-3 câu. Tóm cục diện. Câu PHẢI hoàn chỉnh ý.
  "takeaways": [            // Đúng 3 phần tử, theo thứ tự: Vàng → Chứng khoán → Vĩ mô
    {
      "emoji": string,      // Chỉ 1 trong 3 giá trị: "🔴" | "🟢" | "🟡"
      "asset": string,      // Tên kênh: "Vàng" | "Chứng khoán" | "Vĩ mô"
      "text": string        // 1 câu duy nhất. Phải hoàn chỉnh. Nhận định có tính định hướng.
    }
  ]
}`;

    return await callGeminiJSON<MorningBriefResponse>(prompt, { temperature: 0.5, maxTokens: 4096 });
}

// ── Simple in-memory cache ────────────────────────────────────────────────────

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
