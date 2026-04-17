/* ═══════════════════════════════════════════════════════════
 * Gamification Engine — Duolingo-style XP / Streak / Level
 * Hybrid: localStorage (instant) + Supabase (background sync)
 * ═══════════════════════════════════════════════════════════ */

import { getCachedUserId, saveGamificationState } from "@/lib/supabase/user-data";
import { getGamificationState, setGamificationState, clearGamificationState } from "@/lib/storage";

export interface GamificationState {
  xp: number;
  level: number;
  levelName: string;
  streak: number;          // Ngày liên tục
  lastActiveDate: string;  // YYYY-MM-DD
  actions: string[];       // Hôm nay đã làm gì
  questCompleted: boolean; // Daily quest done?
}

/* ─── XP cho mỗi action ─── */
export const XP_TABLE: Record<string, number> = {
  log_expense: 10,
  check_market: 5,
  pay_debt: 50,
  complete_quest: 100,
  quiz_correct: 20,
  setup_budget: 30,
  read_knowledge: 5,
  customize_cpi: 15,
  complete_onboarding: 50,
  run_backtest: 30,       // Backtest Pro: thưởng XP mỗi lần chạy
};

/* ─── Levels ─── */
const LEVELS = [
  { min: 0, name: "🐣 Vẹt Teen", emoji: "🐣" },
  { min: 200, name: "🦜 Vẹt Trưởng thành", emoji: "🦜" },
  { min: 500, name: "⭐ Vẹt Pro", emoji: "⭐" },
  { min: 1000, name: "👑 Vẹt Master", emoji: "👑" },
  { min: 2000, name: "💎 Đại Gia", emoji: "💎" },
];

function getLevel(xp: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.min) lvl = l;
  }
  return lvl;
}

export function getLevelProgress(xp: number) {
  const current = getLevel(xp);
  const currentIdx = LEVELS.indexOf(current);
  const next = LEVELS[currentIdx + 1];
  if (!next) return { current, next: null, progress: 100, xpToNext: 0 };
  const range = next.min - current.min;
  const progress = Math.min(100, Math.round(((xp - current.min) / range) * 100));
  return { current, next, progress, xpToNext: next.min - xp };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_STATE: GamificationState = {
  xp: 0,
  level: 0,
  levelName: "🐣 Vẹt Teen",
  streak: 0,
  lastActiveDate: "",
  actions: [],
  questCompleted: false,
};

/* ─── Schema validation (security: prevent localStorage tampering) ─── */
function validateGamification(raw: unknown): Partial<GamificationState> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;

  // Type-check every field to block injected garbage
  if (typeof s.xp !== "number" || !Number.isFinite(s.xp) || s.xp < 0) return null;
  if (typeof s.level !== "number" || !Number.isInteger(s.level) || s.level < 0) return null;
  if (typeof s.streak !== "number" || !Number.isInteger(s.streak) || s.streak < 0) return null;
  if (typeof s.levelName !== "string") return null;
  if (typeof s.lastActiveDate !== "string") return null;
  if (!Array.isArray(s.actions)) return null;

  // Cap xp and streak to reasonable bounds (prevent inflate via DevTools)
  const xp = Math.min(Math.max(s.xp, 0), 1_000_000);
  const streak = Math.min(Math.max(s.streak, 0), 365);
  const level = Math.min(Math.max(s.level, 0), LEVELS.length - 1);

  return { xp, level, streak, levelName: s.levelName, lastActiveDate: s.lastActiveDate, actions: s.actions, questCompleted: !!s.questCompleted };
}

/* ─── Read / Write ─── */
export function getGamification(): GamificationState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const saved = getGamificationState();
    if (saved) {
      const valid = validateGamification(saved);
      if (valid) {
        const state = { ...DEFAULT_STATE, ...valid };
        // Reset actions nếu ngày mới
        if (state.lastActiveDate !== todayStr()) {
          state.actions = [];
          state.questCompleted = false;
        }
        return state;
      }
      // Invalid data — discard and start fresh
      clearGamificationState();
    }
  } catch { /* ignore */ }
  return DEFAULT_STATE;
}

function save(state: GamificationState) {
  setGamificationState(state);
  // Background sync to Supabase (non-blocking)
  if (getCachedUserId()) {
    saveGamificationState(state).catch(() => { });
  }
}

/* ─── Core: Add XP ─── */
export function addXP(actionKey: string): { newXP: number; xpGained: number; levelUp: boolean; state: GamificationState } {
  const state = getGamification();
  const xpGained = XP_TABLE[actionKey] || 0;
  const oldLevel = getLevel(state.xp);

  state.xp += xpGained;
  const newLevel = getLevel(state.xp);
  state.level = LEVELS.indexOf(newLevel);
  state.levelName = newLevel.name;

  // Update streak
  const today = todayStr();
  if (state.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    state.streak = state.lastActiveDate === yesterdayStr ? state.streak + 1 : 1;
    state.lastActiveDate = today;
  }

  // Track action
  if (!state.actions.includes(actionKey)) {
    state.actions.push(actionKey);
  }

  save(state);

  return {
    newXP: state.xp,
    xpGained,
    levelUp: oldLevel !== newLevel,
    state,
  };
}

export function spendXP(amount: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("vf_gamification");
    if (!raw) return false;
    const state = JSON.parse(raw) as GamificationState;
    if (state.xp >= amount) {
      state.xp -= amount;

      const newLvl = getLevel(state.xp);
      state.level = LEVELS.indexOf(newLvl);
      state.levelName = newLvl.name;

      save(state);
      return true;
    }
    return false;
  } catch (e) {
    console.warn("spendXP err", e);
    return false;
  }
}

/* ─── Daily Quest ─── */
export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  xp: number;
  actionKey: string;
  completed: boolean;
  icon: string;
}

export function getDailyQuests(): DailyQuest[] {
  const state = getGamification();
  const today = new Date().getDay(); // 0=Sun

  const quests: DailyQuest[] = [
    {
      id: "log_expense",
      title: "Ghi 1 chi tiêu",
      description: "Mở Quỹ Chi tiêu và ghi 1 khoản",
      xp: 10,
      actionKey: "log_expense",
      completed: state.actions.includes("log_expense"),
      icon: "✏️",
    },
    {
      id: "check_market",
      title: "Check thị trường",
      description: "Xem Nhiệt kế thị trường hôm nay",
      xp: 5,
      actionKey: "check_market",
      completed: state.actions.includes("check_market"),
      icon: "📊",
    },
  ];

  // Bonus quest theo ngày
  if (today === 1) { // Monday
    quests.push({
      id: "review_budget",
      title: "Review ngân sách tuần mới",
      description: "Kiểm tra các hũ chi tiêu đầu tuần",
      xp: 15,
      actionKey: "setup_budget",
      completed: state.actions.includes("setup_budget"),
      icon: "📋",
    });
  }
  if (today === 5) { // Friday
    quests.push({
      id: "read_macro",
      title: "Đọc tin kinh tế cuối tuần",
      description: "Xem xu hướng kinh tế vĩ mô",
      xp: 5,
      actionKey: "read_knowledge",
      completed: state.actions.includes("read_knowledge"),
      icon: "📰",
    });
  }

  return quests;
}

/* ─── Complete Daily Quest ─── */
export function completeQuest(actionKey: string) {
  return addXP(actionKey);
}
