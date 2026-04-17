/* ─── Global LLM Rate Limiter (Per-process) ─── */
let history: number[] = [];
const MAX_RPM = 20;

/**
 * Checks if the request is within the 20 RPM limit.
 * Throws an error if the limit is exceeded.
 */
export function checkLlmRateLimit() {
  const now = Date.now();
  // Clear history older than 1 minute
  history = history.filter(t => t > now - 60000);
  
  if (history.length >= MAX_RPM) {
    const oldest = history[0];
    const waitTime = Math.ceil((oldest + 60000 - now) / 1000);
    throw new Error(`Rate limit reached. Please wait ${waitTime}s.`);
  }
  
  history.push(now);
}
