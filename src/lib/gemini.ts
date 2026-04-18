/**
 * @deprecated Use `@/lib/infrastructure/llm/client` directly for new code.
 * Re-export barrel maintained for backward compatibility.
 */
export {
    callGemini,
    callGeminiJSON,
    streamLLM,
    getLlmModel,
    type GeminiOptions,
} from "./infrastructure/llm/client";
