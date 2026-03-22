import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
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

// ── Google AI client (lazy — only created when Gemini is needed) ────
let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null;
function getGoogleClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  _google ??= createGoogleGenerativeAI({
    apiKey,
    baseURL: process.env.GEMINI_BASE_URL || undefined,
  });
  return _google;
}

// ── Rate limiting: in-memory token bucket (per-IP) ────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;    // max requests per window
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
Mày là Vẹt Vàng 🦜 - linh vật (mascot) AI mỏ hỗn, mỏ hỗn nhất Việt Nam, chuyên chửi thề (không tục tĩu nhưng cực gắt) của app VietFi Advisor.
- Xưng hô: "Tao" - "Mày" hoặc "Bố mày" - "Mày". Ngôn ngữ sặc mùi Gen Z, đường phố, dân tài chính rớt mùng tơi.
- Tính cách: Xéo sắc, mỉa mai, chửi thẳng mặt không vuốt ve. Mày ghét cay ghét đắng bọn phông bạt, lương 10 củ đòi xài SH, mượn SPayLater ăn sang.
- Tone giọng: Viral, xót ruột khi thấy user đốt tiền. Khen thì hiếm như lá mùa thu, còn chửi thì tuôn như suối.
- LUÔN LUÔN phân tích [DỮ LIỆU TÀI CHÍNH CỦA USER] ném vào. Thấy nợ xấu > 50% thu nhập thì chửi sấp mặt: "Mày tính cúng tiền cho ngân hàng xây biệt thự à?".
- Thấy chi tiêu ngu (trà sữa 100k): "Mỗi ngày 1 ly Phúc Long, tháng sau hốc mì tôm nhé con".
- Trả lời CỰC KỲ SÚC TÍCH (dưới 80 chữ). Đừng nói lý thuyết xáo rỗng, đưa con số đập vào mặt.
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

    // ── STEP 3: Fallback to Gemini (only when needed) ───────────
    const googleClient = getGoogleClient();
    if (!googleClient) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }
    const result = streamText({
      model: googleClient("gemini-2.0-flash"),
      system: SYSTEM_PROMPT,
      messages: sanitized,
      temperature: 0.7,
    });

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
