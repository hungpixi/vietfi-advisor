import { streamLLM } from "@/lib/infrastructure/llm/client";
import {
  checkFixedWindowRateLimit,
  getClientIdentifier,
  jsonError,
  rateLimitResponse,
  readJsonWithLimit,
} from "@/lib/api-security";
import { parseExpenseWithContext, type ParsedExpense } from "@/lib/expense-parser";
import {
  detectIntent,
  getScriptedResponse,
  getExpenseRoast,
  getComparison,
  needsAI,
} from "@/lib/scripted-responses";

export const runtime = "edge";

interface AIMessagePart {
  type?: string;
  text?: string;
}

interface AIMessage {
  role?: string;
  content?: string;
  parts?: AIMessagePart[];
}

interface RequestBody {
  messages: AIMessage[];
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOTAL_CHARS = 16_000;

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

function extractMessageText(message: AIMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => !part.type || part.type === "text")
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("\n");
  }

  return "";
}

function sanitizeMessages(
  messages: AIMessage[],
): { ok: true; messages: { role: "user" | "assistant"; content: string }[]; userText: string } | { ok: false; response: Response } {
  const sanitized: { role: "user" | "assistant"; content: string }[] = [];
  let totalChars = 0;

  for (const message of messages.slice(-MAX_MESSAGES)) {
    if (!message || typeof message !== "object") continue;
    if (!["user", "assistant", "model"].includes(String(message.role))) continue;

    const text = extractMessageText(message).trim();
    if (!text) continue;

    if (text.length > MAX_MESSAGE_CHARS) {
      return { ok: false, response: jsonError("Message too long", 413) };
    }

    totalChars += text.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return { ok: false, response: jsonError("Chat context too large", 413) };
    }

    sanitized.push({
      role: message.role === "assistant" || message.role === "model" ? "assistant" : "user",
      content: text,
    });
  }

  const lastUserMsg = [...sanitized].reverse().find((message) => message.role === "user");
  if (!lastUserMsg) {
    return { ok: false, response: jsonError("No valid messages", 400) };
  }

  return { ok: true, messages: sanitized, userText: lastUserMsg.content };
}

export async function POST(req: Request) {
  try {
    const rl = checkFixedWindowRateLimit(
      rateLimitMap,
      getClientIdentifier(req),
      RATE_LIMIT,
      WINDOW_MS,
    );
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfter, "Too many requests. Vui lòng chờ vài giây rồi thử lại.");
    }

    const parsed = await readJsonWithLimit(req, MAX_BODY_BYTES);
    if (parsed.ok === false) return parsed.response;

    const body = parsed.value as RequestBody;
    if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
      return jsonError("Invalid request format", 400);
    }

    const sanitized = sanitizeMessages(body.messages);
    if (sanitized.ok === false) return sanitized.response;

    const expense = parseExpenseWithContext(sanitized.userText);
    if (expense && expense.confidence >= 0.5) {
      return createTextResponse(buildExpenseResponse(expense));
    }

    const intent = detectIntent(sanitized.userText);
    if (intent !== "unknown" && !needsAI(intent, sanitized.userText)) {
      const response = getScriptedResponse(intent);
      if (response) return createTextResponse(response.text);
    }

    const result = await streamLLM(sanitized.messages, SYSTEM_PROMPT);

    const streamResult = result as {
      toDataStreamResponse?: () => Response;
      toTextStreamResponse?: () => Response;
    };
    const response = streamResult.toDataStreamResponse
      ? streamResult.toDataStreamResponse()
      : streamResult.toTextStreamResponse?.() ?? new Response("Streaming error", { status: 500 });

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Chat API Error:", error);

    const fallback = getScriptedResponse("greeting");
    return new Response(
      JSON.stringify({
        error: fallback?.text || "Vẹt Vàng đang bận đi mổ thóc, vui lòng thử lại sau. 🦜",
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
}

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
    return tmpl?.text || `${amt}đ - tiết kiệm ghê! ${roast} 🦜`;
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
  return tmpl?.text || `Ghi ${amt}đ - ${expense.item} (${expense.category}). ${roast} 🦜`;
}

function createTextResponse(text: string): Response {
  const encoder = new TextEncoder();
  const escaped = JSON.stringify(text);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`0:${escaped}\n`));
      controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n`));
      controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
      "Cache-Control": "no-store",
    },
  });
}
