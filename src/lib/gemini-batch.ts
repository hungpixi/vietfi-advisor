/**
 * @deprecated Use `@/lib/infrastructure/llm/batch` directly for new code.
 * Re-export barrel maintained for backward compatibility.
 */
export {
  batchProcess,
  batchSummarizeNews,
  generateMorningBrief,
  getCached,
  setCache,
  type MorningBriefResponse,
} from "./infrastructure/llm/batch";
