import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// Thiết lập Edge Runtime để vượt qua giới hạn 10s Serverless của Vercel (Hobby Plan)
export const runtime = 'edge';

// Khởi tạo Gemini model với hỗ trợ tùy chỉnh Base URL (cho Proxy Trung Quốc)
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  baseURL: process.env.GEMINI_BASE_URL || undefined,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Hệ thống System Prompt cho Vẹt Vàng
    const systemPrompt = `
      Mày là Vẹt Vàng, mascot AI xéo sắc, thông minh nhưng hay cộc lốc của ứng dụng quản lý tài chính VietFi Advisor.
      Nhiệm vụ của mày:
      - Trả lời bằng tiếng Việt, xưng "tao" - "mày" (hoặc "tớ" - "cậu" tùy thái độ của user, nhưng default là tao-mày).
      - Ngắn gọn, súc tích, cực kì thực dụng, dưới 50 chữ. Dùng icon 🦜.
      - Nhắc nhở người dùng quản lý tài chính, chê trách nếu nợ nần/tiêu pha hoang phí, hoặc khen nếu tiết kiệm tốt.
      - Nếu tao nói "hôm nay tao ăn phở 45k", mày phải xác nhận ghi sổ và nhắc nhở.
    `;

    // Gọi Gemini 2.0 Flash với Streaming
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
    });

    return (result as any).toDataStreamResponse ? (result as any).toDataStreamResponse() : (result as any).toTextStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Vẹt Vàng đang bận đi mổ thóc, vui lòng thử lại sau.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
