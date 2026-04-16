import { EdgeTTS } from "edge-tts-universal";
import {
  checkFixedWindowRateLimit,
  getClientIdentifier,
  jsonError,
  rateLimitResponse,
  readJsonWithLimit,
} from "@/lib/api-security";

export const runtime = "nodejs";

const ALLOWED_VOICES = ["vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural"];
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 4 * 1024;

function validateProsody(raw: unknown, fallback: string, pattern: RegExp): string {
  if (typeof raw !== "string") return fallback;
  return pattern.test(raw) ? raw : fallback;
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
      return rateLimitResponse(rl.retryAfter, "Too many TTS requests. Vui lòng chờ vài giây.");
    }

    const parsed = await readJsonWithLimit(req, MAX_BODY_BYTES);
    if (!parsed.ok) return parsed.response;

    if (!parsed.value || typeof parsed.value !== "object") {
      return jsonError("Invalid request", 400);
    }

    const body = parsed.value as Record<string, unknown>;
    const text = body.text;
    if (!text || typeof text !== "string" || text.trim().length === 0 || text.length > 500) {
      return jsonError("Text required, max 500 chars", 400);
    }

    const requestedVoice = typeof body.voice === "string" ? body.voice : "";
    const selectedVoice = ALLOWED_VOICES.includes(requestedVoice)
      ? requestedVoice
      : "vi-VN-HoaiMyNeural";

    const rate = validateProsody(body.rate, "+10%", /^[+-](?:[0-9]|[1-4][0-9]|50)%$/);
    const pitch = validateProsody(body.pitch, "+15Hz", /^[+-](?:[0-9]|[1-4][0-9]|50)Hz$/);

    const tts = new EdgeTTS(text.trim(), selectedVoice);
    tts.rate = rate;
    tts.pitch = pitch;

    const result = await tts.synthesize();
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return new Response(
      JSON.stringify({ error: "TTS failed" }),
      { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
    );
  }
}
