import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { checkLlmRateLimit } from "./llm-limiter";

const TROLL_LLM_API_KEY = process.env.TROLL_LLM_API_KEY || process.env.GEMINI_API_KEY;
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
  maxTokens: 2048,
  retries: 3,
  delayMs: 1000,
  model: "gemini-3-flash", // Best price/performance on TrollLLM as confirmed by manual curl
};

/* ─── Call LLM (OpenAI Compatible) with native fetch for max compatibility ─── */
export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!TROLL_LLM_API_KEY) {
    throw new Error('TROLL_LLM_API_KEY (or GEMINI_API_KEY fallback) not configured')
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= (opts.retries || 3); attempt++) {
    try {
      // Check RPM before each call
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
          // Note: No temperature for reasoning models
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error('No content received from LLM');
      }

      return text;
    } catch (error) {
      lastError = error as Error;
      console.error(`LLM attempt ${attempt} failed:`, lastError.message);

      if (attempt < (opts.retries || 3)) {
        await sleep(opts.delayMs! * attempt); // exponential backoff
      }
    }
  }

  throw new Error(`LLM call failed after ${opts.retries} retries: ${lastError?.message}`);
}

/* ─── Call LLM with JSON output ─── */
export async function callGeminiJSON<T>(
  prompt: string,
  options: GeminiOptions = {}
): Promise<T> {
  const jsonPrompt = `${prompt}\n\nRespond ONLY with valid JSON, no markdown, no explanation.`;
  const text = await callGemini(jsonPrompt, options);

  // Strip markdown code fences if present
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
