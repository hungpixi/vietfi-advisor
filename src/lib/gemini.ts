import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface GeminiOptions {
  temperature?: number;
  maxTokens?: number;
  retries?: number;
  delayMs?: number;
}

const DEFAULT_OPTIONS: GeminiOptions = {
  temperature: 0.7,
  maxTokens: 2048,
  retries: 3,
  delayMs: 1000,
};

/* ─── Call Gemini with retry + rate limit ─── */
export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const requestOptions = process.env.GEMINI_BASE_URL
    ? { baseUrl: process.env.GEMINI_BASE_URL }
    : undefined;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
    },
  }, requestOptions);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= (opts.retries || 3); attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text;
    } catch (error) {
      lastError = error as Error;
      console.error(`Gemini attempt ${attempt} failed:`, lastError.message);

      if (attempt < (opts.retries || 3)) {
        await sleep(opts.delayMs! * attempt); // exponential backoff
      }
    }
  }

  throw new Error(`Gemini failed after ${opts.retries} retries: ${lastError?.message}`);
}

/* ─── Call Gemini with JSON output ─── */
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

  return JSON.parse(cleaned) as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
