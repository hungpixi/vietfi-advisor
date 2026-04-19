/**
 * LLM Infrastructure — Unified Client
 *
 * Supports multiple providers: Zen, Google (Gemini), and OpenAI.
 * Automatically handles provider selection and fallback.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { checkLlmRateLimit } from "@/lib/llm-limiter";

const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();

// Zen Configuration
const ZEN_API_KEY = process.env.ZEN_API_KEY || process.env.OPENAI_API_KEY;
const ZEN_BASE_URL = "https://opencode.ai/zen/v1";

// Gemini Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL;

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;

// Model overrides
const ZEN_MODEL = process.env.ZEN_MODEL || process.env.OPENAI_MODEL;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

export interface GeminiOptions {
    temperature?: number;
    maxTokens?: number;
    retries?: number;
    delayMs?: number;
    model?: string;
    provider?: string;
}

const DEFAULT_OPTIONS: GeminiOptions = {
    temperature: 0.1,
    maxTokens: 5000,
    retries: 3,
    delayMs: 1000,
    model: "gemini-2.5-flash-lite",
};

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets the configured LLM model instance based on provider.
 */
export function getLlmModel(options: { provider?: string; model?: string } = {}) {
    const provider = (options.provider || AI_PROVIDER).toLowerCase();
    const isZen = provider === "zen";
    const isOpenAi = provider === "openai" || isZen;

    if (isOpenAi) {
        if (!ZEN_API_KEY && isZen) throw new Error("ZEN_API_KEY (or OPENAI_API_KEY) not configured");
        if (!OPENAI_API_KEY && !isZen) throw new Error("OPENAI_API_KEY not configured");

        const client = createOpenAI({
            apiKey: isZen ? ZEN_API_KEY : OPENAI_API_KEY,
            baseURL: isZen ? ZEN_BASE_URL : OPENAI_BASE_URL,
        });

        // Default models
        const defaultModel = isZen ? (ZEN_MODEL || "minimax-m2.5-free") : (process.env.OPENAI_MODEL || "gpt-4o-mini");
        return client.chat(options.model || defaultModel);
    }

    // Default to Gemini (Google)
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
    const google = createGoogleGenerativeAI({
        apiKey: GEMINI_API_KEY,
        ...(GEMINI_BASE_URL ? { baseURL: GEMINI_BASE_URL } : {}),
    });
    return google(options.model || GEMINI_MODEL || "gemini-2.5-flash-lite");
}

function getModel(provider: string, modelName?: string) {
    return getLlmModel({ provider, model: modelName });
}

export async function callGemini(
    prompt: string,
    options: GeminiOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const provider = opts.provider || AI_PROVIDER;

    checkLlmRateLimit();

    let lastError: Error | null = null;
    const retries = opts.retries || 3;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const model = getModel(provider, opts.model);
            const { text } = await generateText({
                model,
                prompt,
                temperature: opts.temperature,
                maxTokens: opts.maxTokens,
            } as any);
            return text;
        } catch (error: any) {
            lastError = error;
            console.error(`LLM (${provider}) attempt ${attempt} failed:`, error.message);

            // Automatic fallback to gemini if zen fails
            const isAuthError = error.statusCode === 401 || error.message?.includes("API key");

            if (provider === "zen" && GEMINI_API_KEY && (attempt === 1 || isAuthError)) {
                console.warn(`Zen failed (${error.message}), falling back to Gemini...`);
                try {
                    const fallbackModel = getModel("gemini", "gemini-2.5-flash-lite");
                    const { text } = await generateText({
                        model: fallbackModel,
                        prompt,
                        temperature: opts.temperature,
                        maxTokens: opts.maxTokens,
                    } as any);
                    return text;
                } catch (fallbackError: any) {
                    console.error("Gemini fallback also failed:", fallbackError.message);
                }

                // If it's an Auth error and fallback failed, don't keep trying the primary
                if (isAuthError) break;
            }

            if (attempt < retries) await sleep(opts.delayMs! * attempt);
        }
    }
    throw lastError || new Error(`Failed to call LLM provider: ${provider}`);
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

/**
 * Streaming version of LLM call.
 */
export async function streamLLM(
    messages: any[],
    systemPrompt?: string,
    options: GeminiOptions = {}
) {
    const provider = options.provider || AI_PROVIDER;
    const model = getModel(provider, options.model);

    checkLlmRateLimit();

    return streamText({
        model,
        system: systemPrompt,
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
    } as any);
}
