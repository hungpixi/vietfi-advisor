import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { parseExpenseWithContext, type ParsedExpense } from '@/lib/expense-parser';
import {
  detectIntent, getScriptedResponse, getExpenseRoast,
  getComparison, needsAI, type Intent
} from '@/lib/scripted-responses';

// Edge Runtime — vượt giới hạn 10s Serverless
export const runtime = 'edge';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  baseURL: process.env.GEMINI_BASE_URL || undefined,
});

const SYSTEM_PROMPT = `
Mày là Vẹt Vàng, mascot AI xéo sắc, thông minh của app VietFi Advisor.
- Trả lời tiếng Việt, xưng "tao" - "mày".
- Ngắn gọn, súc tích, cực kì thực dụng, dưới 50 chữ. Dùng icon 🦜.
- Nhắc nhở quản lý tài chính, chê trách nếu tiêu hoang, khen nếu tiết kiệm.
- Nếu hỏi về đầu tư/nợ/tiết kiệm → trả lời CỤ THỂ với con số.
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const userText = lastUserMsg?.content || lastUserMsg?.parts?.[0]?.text || '';

    // ── STEP 1: Try expense parsing (0 API calls) ──
    const expense = parseExpenseWithContext(userText);
    if (expense && expense.confidence >= 0.5) {
      const response = buildExpenseResponse(expense);
      return createTextResponse(response);
    }

    // ── STEP 2: Try scripted response (0 API calls) ──
    const intent = detectIntent(userText);
    if (intent !== 'unknown' && !needsAI(intent, userText)) {
      const response = getScriptedResponse(intent);
      if (response) {
        return createTextResponse(response.text);
      }
    }

    // ── STEP 3: Fallback to Gemini (only when needed) ──
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
    });

    return (result as any).toDataStreamResponse
      ? (result as any).toDataStreamResponse()
      : (result as any).toTextStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);

    // Nếu Gemini lỗi → vẫn trả scripted response
    const fallback = getScriptedResponse('greeting');
    return new Response(
      JSON.stringify({
        error: fallback || 'Vẹt Vàng đang bận đi mổ thóc, vui lòng thử lại sau. 🦜'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── Helper: Build expense response ──
function buildExpenseResponse(expense: ParsedExpense): string {
  const amt = expense.amount.toLocaleString('vi-VN');
  const roast = getExpenseRoast(expense.category, expense.amount);

  if (expense.amount >= 500_000) {
    const compare = getComparison(expense.amount);
    const tmpl = getScriptedResponse('expense_high', {
      amount: `${amt}đ`,
      item: expense.item,
      compare,
    });
    return tmpl?.text || `${amt}đ cho ${expense.item}?! ${roast} 🦜`;
  }

  if (expense.amount <= 20_000) {
    const tmpl = getScriptedResponse('expense_low', {
      amount: `${amt}đ`,
      item: expense.item,
    });
    return tmpl?.text || `${amt}đ — tiết kiệm ghê! ${roast} 🦜`;
  }

  const tmpl = getScriptedResponse('expense_logged', {
    amount: `${amt}đ`,
    item: expense.item,
    category: expense.category,
    pot: expense.pot,
    roast,
    total: '...',
    remaining: '...',
  });
  return tmpl?.text || `✅ Ghi ${amt}đ — ${expense.item} (${expense.category}). ${roast} 🦜`;
}

// ── Helper: Non-streaming text response ──
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
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  });
}

