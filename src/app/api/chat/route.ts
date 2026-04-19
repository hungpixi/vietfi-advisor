import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  tool,
} from "ai";
import { z } from "zod";
import { streamLLM } from "@/lib/infrastructure/llm/client";
import {
  checkFixedWindowRateLimit,
  getClientIdentifier,
  jsonError,
  rateLimitResponse,
  readJsonWithLimit,
} from "@/lib/api-security";
import { parseExpenseWithContext } from "@/lib/expense-parser";
import {
  detectIntent,
  getScriptedResponse,
  getExpenseRoast,
  needsAI,
} from "@/lib/scripted-responses";

export const runtime = "edge";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: any[];
  data?: { context?: string; market?: string; instruction?: string };
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: Request) {
  try {
    const rl = checkFixedWindowRateLimit(rateLimitMap, getClientIdentifier(req), 10, 60000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

    const parsed = await readJsonWithLimit(req, 64 * 1024);
    if (!parsed.ok) return parsed.response;

    const body = parsed.value as RequestBody;
    const messages: AIMessage[] = (body.messages || []).slice(-10).map(m => ({
      role: (m.role === "assistant" || m.role === "model" ? "assistant" : "user") as "user" | "assistant",
      content: extractText(m).trim()
    })).filter(m => m.content);

    if (messages.length === 0) return jsonError("No messages", 400);
    const lastUserMsg = messages[messages.length - 1].content;

    // 1. Fast logic (Expense & Intent)
    const expense = parseExpenseWithContext(lastUserMsg);
    if (expense && expense.confidence >= 0.5) {
      const amt = expense.amount.toLocaleString("vi-VN");
      return createLocalResponse(`Ghi ${amt}đ - ${expense.item}. ${getExpenseRoast(expense.category, expense.amount)} 🦜`);
    }

    const intent = detectIntent(lastUserMsg);
    if (intent !== "unknown" && !needsAI(intent, lastUserMsg)) {
      const scripted = getScriptedResponse(intent);
      if (scripted) return createLocalResponse(scripted.text);
    }

    // 2. Dynamic System Prompt
    let dynamicSystemPrompt = `Bạn là Vẹt Vàng 🦜 - Mascot mỏ hỗn của VietFi Advisor. 

DỮ LIỆU THỰC TẾ (SỐ LIỆU DUY NHẤT ĐƯỢC TIN TƯỞNG):
${body.data?.context || "Chưa có dữ liệu cá nhân."}
${body.data?.market ? `Thị trường: ${body.data.market}` : "Đang tải dữ liệu thị trường..."}

QUY TẮC CHI TIÊU (CỰC KỲ KHẮT KHE):
1. Mỗi khi người dùng bảo vừa mua đồ/chi tiêu, bạn PHẢI HỎI GIÁ NGAY LẬP TỨC.
2. TUYỆT ĐỐI KHÔNG được tự ý lấy số tiền từ lịch sử chat cũ để áp vào món đồ mới. Phải hỏi lại như chưa từng biết gì.
3. CHỈ dùng tool 'record_expense' khi người dùng đã cung cấp số tiền ngay trong câu chat HIỆN TẠI.
4. Trả lời mỉa mai, xéo xắt, ngắn gọn dưới 50 chữ.
`;

    // 3. Stream with Tools
    const result = await streamLLM(messages, dynamicSystemPrompt, {
      tools: {
        record_expense: tool({
          description: "Ghi lại một khoản chi tiêu vào sổ thu chi.",
          parameters: z.object({
            amount: z.number().describe("Số tiền chi tiêu (VND)"),
            item: z.string().describe("Tên món đồ hoặc dịch vụ"),
            category: z.string().optional().describe("Danh mục (Ăn uống, Giải trí, Shopping, etc.)"),
          }),
          execute: async ({ amount, item, category }) => {
            return { success: true, recorded: { amount, item, category } };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({ headers: { "Cache-Control": "no-store" } });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return new Response(JSON.stringify({ error: "Hệ thống bận" }), { status: 500 });
  }
}

function extractText(m: any): string {
  if (typeof m.content === "string") return m.content;
  if (Array.isArray(m.content)) {
    return m.content.map((c: any) => (typeof c === "string" ? c : c.text || "")).join("\n");
  }
  if (Array.isArray(m.parts)) {
    return m.parts.map((p: any) => p.text || "").join("\n");
  }
  return "";
}

function createLocalResponse(text: string): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = Date.now().toString();
      writer.write({ type: "start", messageId: "msg-" + id });
      writer.write({ type: "text-start", id: "text-" + id });
      writer.write({ type: "text-delta", id: "text-" + id, delta: text });
      writer.write({ type: "text-end", id: "text-" + id });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
