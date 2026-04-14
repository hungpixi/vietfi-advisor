import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { checkLlmRateLimit } from "./llm-limiter";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL;

interface GeminiOptions {
  temperature?: number;
  maxTokens?: number;
  retries?: number;
  delayMs?: number;
  model?: string;
}

const DEFAULT_OPTIONS: GeminiOptions = {
  temperature: 0.7,
  maxTokens: 5000,
  retries: 3,
  delayMs: 1000,
  model: "gemini-2.5-flash-lite",
};

export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
    throw new Error("GEMINI_API_KEY not configured or empty");
  }

  checkLlmRateLimit();

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= (opts.retries || 3); attempt++) {
    try {
      const google = createGoogleGenerativeAI({
        apiKey: GEMINI_API_KEY,
        ...(GEMINI_BASE_URL ? { baseURL: GEMINI_BASE_URL } : {}),
      });

      const { text } = await generateText({
        model: google(opts.model || "gemini-2.5-flash-lite"),
        prompt,
        temperature: opts.temperature,
        ...({ maxTokens: opts.maxTokens } as any),
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
