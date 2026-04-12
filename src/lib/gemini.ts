import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

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
  model: GEMINI_MODEL,
};

export function getGeminiApiKey(): string | null {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || null;
}

function createGoogleProvider() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Set GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY.");
  }

  return createGoogleGenerativeAI({ apiKey });
}

export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const googleProvider = createGoogleProvider();

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= (opts.retries || 3); attempt++) {
    try {
      const { text } = await generateText({
        model: googleProvider(opts.model || GEMINI_MODEL),
        prompt,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });
      return text;
    } catch (error) {
      lastError = error as Error;
      console.error(`Gemini attempt ${attempt} failed:`, lastError.message);
      if (attempt < (opts.retries || 3)) await sleep((opts.delayMs || 1000) * attempt);
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
