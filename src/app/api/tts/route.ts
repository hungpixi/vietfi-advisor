/**
 * Edge TTS API Route — Giọng nói tiếng Việt MIỄN PHÍ
 * ====================================================
 * Dùng Microsoft Edge TTS (không cần API key)
 * Giọng: vi-VN-HoaiMyNeural (nữ) / vi-VN-NamMinhNeural (nam)
 *
 * Client gọi: POST /api/tts { text, voice?, rate?, pitch? }
 * Response: audio/mpeg stream
 */

import { EdgeTTS } from "edge-tts-universal";

export const runtime = "nodejs"; // edge-tts cần Node.js runtime

export async function POST(req: Request) {
  try {
    const { text, voice, rate, pitch } = await req.json();

    if (!text || typeof text !== "string" || text.length > 500) {
      return new Response(
        JSON.stringify({ error: "Text required, max 500 chars" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const selectedVoice = voice || "vi-VN-HoaiMyNeural";
    const tts = new EdgeTTS(text, selectedVoice);
    tts.rate = rate || "+10%";    // Nhanh hơn xíu
    tts.pitch = pitch || "+15Hz"; // Cao hơn cho giọng vẹt

    const result = await tts.synthesize();
    const audioBlob: Blob = result.audio;
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return new Response(
      JSON.stringify({ error: "TTS failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
