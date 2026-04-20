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

function getDefaultProvider() {
    return (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();
}

function getZenApiKey() {
    return process.env.ZEN_API_KEY || process.env.OPENAI_API_KEY;
}

const ZEN_BASE_URL = "https://opencode.ai/zen/v1";

function getGeminiApiKey() {
    return process.env.GEMINI_API_KEY
        || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        || process.env.GOOGLE_API_KEY;
}

function getGeminiBaseUrl() {
    return process.env.GEMINI_BASE_URL;
}

function getOpenAiApiKey() {
    return process.env.OPENAI_API_KEY;
}

function getOpenAiBaseUrl() {
    return process.env.OPENAI_BASE_URL;
}

function getZenModel() {
    return process.env.ZEN_MODEL || process.env.OPENAI_MODEL;
}

function getGeminiModel() {
    return process.env.GEMINI_MODEL;
}

export function isLlmConfigured(provider = getDefaultProvider()): boolean {
    const normalizedProvider = provider.toLowerCase().trim();
    if (normalizedProvider === "zen") return Boolean(getZenApiKey());
    if (normalizedProvider === "openai") return Boolean(getOpenAiApiKey());
    return Boolean(getGeminiApiKey());
}

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
    const provider = (options.provider || getDefaultProvider()).toLowerCase();
    const isZen = provider === "zen";
    const isOpenAi = provider === "openai" || isZen;
    const zenApiKey = getZenApiKey();
    const openAiApiKey = getOpenAiApiKey();
    const openAiBaseUrl = getOpenAiBaseUrl();
    const geminiApiKey = getGeminiApiKey();
    const geminiBaseUrl = getGeminiBaseUrl();

    if (isOpenAi) {
        if (!zenApiKey && isZen) throw new Error("ZEN_API_KEY (or OPENAI_API_KEY) not configured");
        if (!openAiApiKey && !isZen) throw new Error("OPENAI_API_KEY not configured");

        const client = createOpenAI({
            apiKey: isZen ? zenApiKey : openAiApiKey,
            baseURL: isZen ? ZEN_BASE_URL : openAiBaseUrl,
        });

        // Default models
        const defaultModel = isZen ? (getZenModel() || "minimax-m2.5-free") : (process.env.OPENAI_MODEL || "gpt-4o-mini");
        return client.chat(options.model || defaultModel);
    }

    // Default to Gemini (Google)
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");
    const google = createGoogleGenerativeAI({
        apiKey: geminiApiKey,
        ...(geminiBaseUrl ? { baseURL: geminiBaseUrl } : {}),
    });
    return google(options.model || getGeminiModel() || "gemini-2.5-flash-lite");
}

function getModel(provider: string, modelName?: string) {
    return getLlmModel({ provider, model: modelName });
}

export async function callGemini(
    prompt: string,
    options: GeminiOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const provider = opts.provider || getDefaultProvider();

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

            if (provider === "zen" && getGeminiApiKey() && (attempt === 1 || isAuthError)) {
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
    const provider = options.provider || getDefaultProvider();
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
