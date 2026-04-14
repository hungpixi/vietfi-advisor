import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { checkLlmRateLimit } from "./llm-limiter";

const AI_PROVIDER = process.env.AI_PROVIDER || "trollllm";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TROLL_LLM_API_KEY = process.env.TROLL_LLM_API_KEY || GEMINI_API_KEY;
const TROLL_LLM_BASE_URL = "https://chat.trollllm.xyz/v1";

interface GeminiOptions { // Keep interface name for compatibility
  temperature?: number;
  maxTokens?: number;
  retries?: number;
  delayMs?: number;
  model?: string; // Optional custom model name
}

const DEFAULT_OPTIONS: GeminiOptions = {
  temperature: 0.7,
  maxTokens: 5000, // Compact but sufficient for thought + content
  retries: 3,
  delayMs: 1000,
  // Default models based on provider
  model: AI_PROVIDER === "trollllm" ? "gemini-3-flash" : "gemini-1.5-flash",
};

/* ─── Call LLM (Automatic Switch based on AI_PROVIDER) ─── */
export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  if (AI_PROVIDER === "trollllm") {
    return callTrollLLM(prompt, options);
  } else {
    return callGoogleGemini(prompt, options);
  }
}

/* ─── Native Gemini (Google) ─── */
async function callGoogleGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  const maxOutputTokens = typeof opts.maxTokens === "number" ? opts.maxTokens : undefined;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= (opts.retries || 3); attempt++) {
    try {
      const { text } = await generateText({
        model: google(opts.model || "gemini-1.5-flash"),
        prompt,
        temperature: opts.temperature,
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
      });
      return text;
    } catch (error) {
      lastError = error as Error;
      console.error(`Gemini attempt ${attempt} failed:`, lastError.message);
      if (attempt < (opts.retries || 3)) await sleep(opts.delayMs! * attempt);
    }
  }
  throw lastError || new Error("Failed to call Google Gemini");
}

/* ─── TrollLLM (OpenAI Compatible) with native fetch ─── */
async function callTrollLLM(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!TROLL_LLM_API_KEY) throw new Error("TROLL_LLM_API_KEY not configured");

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= (opts.retries || 3); attempt++) {
    try {
      checkLlmRateLimit();

      const response = await fetch(`${TROLL_LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TROLL_LLM_API_KEY}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          model: opts.model || "gemini-3-flash",
          messages: [{ role: 'user', content: prompt }],
          max_tokens: opts.maxTokens,
          // No temperature for reasoning models on TrollLLM
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        console.error('TrollLLM Response without content:', JSON.stringify(data));
        throw new Error('No content received from TrollLLM');
      }
      return text;
    } catch (error) {
      lastError = error as Error;
      console.error(`TrollLLM attempt ${attempt} failed:`, lastError.message);
      if (attempt < (opts.retries || 3)) await sleep(opts.delayMs! * attempt);
    }
  }
  throw lastError || new Error("Failed to call TrollLLM");
}

/* ─── Shared Utilities ─── */
export async function callGeminiJSON<T>(
  prompt: string,
  options: GeminiOptions = {}
): Promise<T> {
  const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON, no markdown, no explanation.`;
  const text = await callGemini(jsonPrompt, options);

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("Failed to parse LLM JSON:", text);
    throw err;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
