import { jsonError } from "@/lib/api-security";

export const runtime = "nodejs";

// TTS đã bị tắt theo yêu cầu product.
// Giữ file để không phá vỡ routing Next.js.
export async function POST() {
  return jsonError("TTS đã bị tắt", 405);
}
