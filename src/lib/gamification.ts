/**
 * @deprecated Use `@/lib/application/gamification` directly for new code.
 * Re-export barrel maintained for backward compatibility.
 */
export {
  getGamification,
  addXP,
  spendXP,
  getDailyQuests,
  completeQuest,
  getLevelProgress,
  XP_TABLE,
  type GamificationState,
  type DailyQuest,
} from "./application/gamification";
