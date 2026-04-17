type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
};

const MAX_IDENTIFIER_LENGTH = 128;

function sanitizeIdentifier(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.split(",")[0]?.trim();
  if (!trimmed) return null;

  // Keep rate-limit keys boring so attacker-controlled headers cannot bloat memory.
  const safe = trimmed.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, MAX_IDENTIFIER_LENGTH);
  return safe || null;
}

export function getClientIdentifier(request: Request): string {
  return (
    sanitizeIdentifier(request.headers.get("cf-connecting-ip")) ||
    sanitizeIdentifier(request.headers.get("x-real-ip")) ||
    sanitizeIdentifier(request.headers.get("x-forwarded-for")) ||
    sanitizeIdentifier(request.headers.get("user-agent")) ||
    "unknown"
  );
}

export function checkFixedWindowRateLimit(
  bucket: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  for (const [entryKey, entry] of bucket.entries()) {
    if (now >= entry.resetAt) bucket.delete(entryKey);
  }

  const entry = bucket.get(key);
  if (!entry || now >= entry.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function jsonError(message: string, status: number, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function rateLimitResponse(
  retryAfter = 60,
  message = "Too many requests. Please try again later.",
): Response {
  return jsonError(message, 429, { "Retry-After": String(retryAfter) });
}

export async function readJsonWithLimit(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsed) && parsed > maxBytes) {
      return { ok: false, response: jsonError("Request body too large", 413) };
    }
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: jsonError("Invalid request body", 400) };
  }

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, response: jsonError("Request body too large", 413) };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError("Invalid JSON body", 400) };
  }
}
