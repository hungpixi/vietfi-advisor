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

// ── Voice whitelist (security) ───────────────────────────────────
const ALLOWED_VOICES = ["vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural"];

// ── Rate limiting (in-memory token bucket) ───────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT    = 30;    // max 30 TTS requests per window
const WINDOW_MS     = 60_000; // 60-second window
const TTS_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")?.trim()
    || "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (now - lastCleanup >= TTS_CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, v] of rateLimitMap) {
      if (now >= v.resetAt) rateLimitMap.delete(k);
    }
  }
  const entry = rateLimitMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }
  return true;
}

export async function POST(req: Request) {
  try {
    // ── Rate limiting ────────────────────────────────────────────
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many TTS requests. Vui lòng chờ vài giây." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    // ── Parse request body ──────────────────────────────────────
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    if (!raw || typeof raw !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const body = raw as Record<string, unknown>;
    const text = body.text;
    if (!text || typeof text !== "string" || text.length === 0 || text.length > 500) {
      return new Response(
        JSON.stringify({ error: "Text required, max 500 chars" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Voice whitelist (security) ──────────────────────────────
    const requestedVoice = typeof body.voice === "string" ? body.voice : "";
    const selectedVoice = ALLOWED_VOICES.includes(requestedVoice)
      ? requestedVoice
      : "vi-VN-HoaiMyNeural"; // safe default

    // ── Validate rate/pitch ──────────────────────────────────────
    const rate  = typeof body.rate  === "string" ? body.rate  : "+10%";
    const pitch = typeof body.pitch === "string" ? body.pitch : "+15Hz";

    const tts = new EdgeTTS(text, selectedVoice);
    tts.rate  = rate;
    tts.pitch = pitch;

    const result = await tts.synthesize();
    const audioBlob  = result.audio;
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());

    return new Response(audioBuffer, {
      headers: {
        "Content-Type":   "audio/mpeg",
        "Cache-Control":  "public, max-age=3600",
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
