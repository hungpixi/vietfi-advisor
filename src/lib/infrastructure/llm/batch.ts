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
Bạn là "Vẹt Vàng", chuyên gia phân tích tài chính phong cách xéo xắt nhưng thâm sâu.

Dữ liệu thị trường:
- VN-Index: ${data.vnIndex.value} điểm (${data.vnIndex.change > 0 ? "+" : ""}${data.vnIndex.change}%)
- Vàng SJC: ${data.goldSjc.sell.toLocaleString("vi-VN")} đ/lượng
- USD/VND: ${data.usdVnd.rate.toLocaleString("vi-VN")}

Tin tức tiêu biểu:
${data.topNews.map((n, i) => `${i + 1}. ${n}`).join("\n")}

OUTPUT JSON THUẦN (không mã markdown):
{
  "summary": "Tóm tắt thị trường xéo xắt nhưng có kiến thức chuyên môn",
  "takeaways": [
    { "emoji": "🔴/🟢/🟡", "asset": "Chứng khoán/Vàng/Vĩ mô/Tiết kiệm/Crypto", "text": "Câu phân tích ngắn" }
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
