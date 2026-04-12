import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { checkLlmRateLimit } from '@/lib/llm-limiter';
import { parseExpenseWithContext, type ParsedExpense } from '@/lib/expense-parser';
import {
  detectIntent, getScriptedResponse, getExpenseRoast,
  getComparison, needsAI
} from '@/lib/scripted-responses';

// Edge Runtime — vượt giới hạn 10s Serverless
export const runtime = 'edge';

// ── Types ─────────────────────────────────────────────────────────
interface AIMessagePart {
  type: "text";
  text: string;
}

interface AIMessage {
  role: "user" | "assistant" | "model" | "system";
  content?: string;
  parts?: AIMessagePart[];
}

interface RequestBody {
  messages: AIMessage[];
}

// ── Rate limiting: in-memory token bucket (per-IP) ────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 200;    // max requests per window (increased for testing)
const WINDOW_MS  = 60_000; // 60-second window

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) {
      return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    entry.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  return { allowed: true };
}

// Periodic cleanup to prevent unbounded Map growth
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
function evictStaleRateLimitEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetAt) rateLimitMap.delete(ip);
  }
}

const SYSTEM_PROMPT = `
Bạn là linh vật (mascot) AI tư vấn tài chính của ứng dụng VietFi Advisor, tên là "Vẹt Vàng 🦜".
Sứ mệnh của bạn là giúp người dùng Việt Nam thoát khỏi nợ nần, quản lý chi tiêu cá nhân hiệu quả và đạt tự do tài chính.

Quy tắc cốt lõi:
1. Đọc kỹ khối [HƯỚNG DẪN TÍNH CÁCH CỦA VẸT VÀNG MÀ BẠN PHẢI NHẬP VAI] ở đầu tin nhắn của người dùng để biết bạn đang ở CHẾ ĐỘ NÀO (Mỏ Hỗn, Chữa Lành, hay Chuyên Gia). Từ vựng, xưng hô và thái độ phải TUYỆT ĐỐI TUÂN THỦ chế độ đó.
2. Đọc kỹ khối [DỮ LIỆU TÀI CHÍNH CỦA USER] (DTI, Cashflow 50-30-20, Thu nhập, Nợ) để đưa ra lời khuyên cá nhân hóa. Nếu DTI > 60%, hãy coi đây là tình trạng khẩn cấp.
3. Đọc khối [DỮ LIỆU THỊ TRƯỜNG REALTIME] (nếu có) để trả lời các câu hỏi phân bổ vốn, so sánh kênh đầu tư (tiết kiệm ngân hàng vs vàng SJC/PNJ vs chứng khoán).
4. Câu trả lời CỰC KỲ SÚC TÍCH, CÓ SỨC NẶNG (dưới 100 chữ), đi thẳng vào vấn đề bằng con số.
5. Không bao giờ tự xưng là "Trợ lý ảo AI", bạn là Vẹt Vàng.
`;

export async function POST(req: Request) {
  try {
    // ── Rate limiting ────────────────────────────────────────────
    evictStaleRateLimitEntries();
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
                  || req.headers.get("cf-connecting-ip")?.trim()
                  || "unknown";
    const rl = checkRateLimit(clientIP);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Vui lòng chờ vài giây rồi thử lại." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) } }
      );
    }

    // ── Parse & validate request body ───────────────────────────
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    if (!raw || typeof raw !== "object" || !Array.isArray((raw as RequestBody).messages)) {
      return new Response(JSON.stringify({ error: "Invalid request format" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const messages: AIMessage[] = (raw as RequestBody).messages;

    // ── Security: Sanitize messages array ────────────────────────
    // CRITICAL: block role:"system" injection — attacker could override SYSTEM_PROMPT
    const MAX_MESSAGES = 20;
    const sanitized = messages.slice(-MAX_MESSAGES).map((m): { role: "user" | "assistant"; content: string } | null => {
      if (!m || typeof m !== "object") return null;
      const role: unknown = m.role;
      if (!["user", "assistant", "model"].includes(role as string)) return null;

      // Extract text from OpenAI format (content string) or Vercel AI SDK format (parts[])
      let text: string = "";
      if (typeof m.content === "string") {
        text = m.content;
      } else if (Array.isArray(m.parts) && m.parts[0] && typeof m.parts[0] === "object") {
        text = String((m.parts[0] as AIMessagePart).text ?? "");
      }
      if (!text) return null;

      return {
        role: role === "model" ? "assistant" : "user",
        content: text,
      };
    }).filter((m): m is NonNullable<typeof m> => m !== null);

    if (sanitized.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const lastUserMsg = [...sanitized].reverse().find((m) => m.role === "user");
    const userText = lastUserMsg?.content || "";

    // ── STEP 1: Try expense parsing (0 API calls) ───────────────
    const expense = parseExpenseWithContext(userText);
    if (expense && expense.confidence >= 0.5) {
      const response = buildExpenseResponse(expense);
      return createTextResponse(response);
    }

    // ── STEP 2: Try scripted response (0 API calls) ─────────────
    const intent = detectIntent(userText);
    if (intent !== "unknown" && !needsAI(intent, userText)) {
      const response = getScriptedResponse(intent);
      if (response) {
        return createTextResponse(response.text);
      }
    }

    // ── STEP 3: Fallback to AI Provider (Ollama, Google, or TrollLLM) ──
    const AI_PROVIDER = process.env.AI_PROVIDER || "ollama";
    const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:14b";

    // RPM check logic (currently shared, though Gemini has its own limits)
    try {
      checkLlmRateLimit();
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 429, headers: { "Content-Type": "application/json" }
      });
    }

    let model;
    let result;

    if (AI_PROVIDER === "ollama") {
      // Ollama local: OpenAI-compatible API
      const ollama = createOpenAI({
        apiKey: "ollama", // Required but ignored
        baseURL: OLLAMA_BASE_URL,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      model = ollama(OLLAMA_MODEL);
      result = streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: sanitized,
      });
    } else if (AI_PROVIDER === "ollama-cloud") {
      // Ollama Cloud: https://ollama.com
      const ollamaApiKey = process.env.OLLAMA_API_KEY;
      if (!ollamaApiKey) {
        return new Response(JSON.stringify({ error: "OLLAMA_API_KEY is not configured." }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
      const ollama = createOpenAI({
        apiKey: ollamaApiKey,
        baseURL: "https://ollama.com",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      model = ollama(OLLAMA_MODEL);
      result = streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: sanitized,
      });
    } else if (AI_PROVIDER === "trollllm") {
      const apiKey = process.env.TROLL_LLM_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TROLL_LLM_API_KEY is not configured." }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
      const troll = createOpenAI({
        apiKey,
        baseURL: "https://chat.trollllm.xyz/v1",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      model = troll("gemini-3-flash");
      result = streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: sanitized,
      });
    } else if (AI_PROVIDER === "google") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured." }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
      model = google("gemini-1.5-flash");
      result = streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: sanitized,
      });
    } else {
      return new Response(JSON.stringify({ error: `Unknown AI_PROVIDER: ${AI_PROVIDER}. Use: ollama, ollama-cloud, google, or trollllm.` }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Vercel AI SDK v6 returns StreamTextResult with .toDataStreamResponse() / .toTextStreamResponse()
    const streamResult = result as { toDataStreamResponse?: () => Response; toTextStreamResponse?: () => Response };
    return streamResult.toDataStreamResponse
      ? streamResult.toDataStreamResponse()
      : streamResult.toTextStreamResponse?.() ?? new Response("Streaming error", { status: 500 });
  } catch (error) {
    console.error("Chat API Error:", error);

    const fallback = getScriptedResponse("greeting");
    return new Response(
      JSON.stringify({
        error: fallback?.text || "Vẹt Vàng đang bận đi mổ thóc, vui lòng thử lại sau. 🦜"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── Helper: Build expense response ────────────────────────────────
function buildExpenseResponse(expense: ParsedExpense): string {
  const amt = expense.amount.toLocaleString("vi-VN");
  const roast = getExpenseRoast(expense.category, expense.amount);

  if (expense.amount >= 500_000) {
    const compare = getComparison(expense.amount);
    const tmpl = getScriptedResponse("expense_high", {
      amount: `${amt}đ`,
      item: expense.item,
      compare,
    });
    return tmpl?.text || `${amt}đ cho ${expense.item}?! ${roast} 🦜`;
  }

  if (expense.amount <= 20_000) {
    const tmpl = getScriptedResponse("expense_low", {
      amount: `${amt}đ`,
      item: expense.item,
    });
    return tmpl?.text || `${amt}đ — tiết kiệm ghê! ${roast} 🦜`;
  }

  const tmpl = getScriptedResponse("expense_logged", {
    amount: `${amt}đ`,
    item: expense.item,
    category: expense.category,
    pot: expense.pot,
    roast,
    total: "...",
    remaining: "...",
  });
  return tmpl?.text || `✅ Ghi ${amt}đ — ${expense.item} (${expense.category}). ${roast} 🦜`;
}

// ── Helper: Non-streaming text response ───────────────────────────
// Must match Vercel AI SDK Data Stream Protocol for useChat() hook
function createTextResponse(text: string): Response {
  const encoder = new TextEncoder();

  // Properly escape for JSON string inside data stream
  const escaped = JSON.stringify(text);

  const stream = new ReadableStream({
    start(controller) {
      // Text part: 0:<json-string>\n
      controller.enqueue(encoder.encode(`0:${escaped}\n`));
      // Finish step: e:{...}\n
      controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n`));
      // Finish message: d:{...}\n
      controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}
