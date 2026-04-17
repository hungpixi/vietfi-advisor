/**
 * Application Layer — Gamification Use-Case
 *
 * Orchestrates between:
 * - Domain: gamification rules (XP, levels, validation)
 * - Infrastructure: localStorage (persistence), Supabase (background sync)
 *
 * Moved from src/lib/gamification.ts
 */

import { getCachedUserId, saveGamificationState } from "@/lib/supabase/user-data";
import { getGamificationState, setGamificationState, clearGamificationState } from "@/lib/storage";
import {
    XP_TABLE,
    LEVELS,
    getLevel,
    getLevelProgress,
    validateGamification,
    DEFAULT_GAMIFICATION_STATE,
    type GamificationState,
} from "@/lib/domain/gamification/rules";

// Re-export domain types and pure functions for consumers
export type { GamificationState };
export { XP_TABLE, getLevelProgress };

export interface DailyQuest {
    id: string;
    title: string;
    description: string;
    xp: number;
    actionKey: string;
    completed: boolean;
    icon: string;
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

export function getGamification(): GamificationState {
    if (typeof window === "undefined") return DEFAULT_GAMIFICATION_STATE;
    try {
        const saved = getGamificationState();
        if (saved) {
            const valid = validateGamification(saved);
            if (valid) {
                const state = { ...DEFAULT_GAMIFICATION_STATE, ...valid };
                if (state.lastActiveDate !== todayStr()) {
                    state.actions = [];
                    state.questCompleted = false;
                }
                return state;
            }
            clearGamificationState();
        }
    } catch { /* ignore */ }
    return DEFAULT_GAMIFICATION_STATE;
}

function save(state: GamificationState) {
    setGamificationState(state);
    if (getCachedUserId()) {
        saveGamificationState(state).catch(() => { });
    }
}

export function addXP(actionKey: string): { newXP: number; xpGained: number; levelUp: boolean; state: GamificationState } {
    const state = getGamification();
    const xpGained = XP_TABLE[actionKey] || 0;
    const oldLevel = getLevel(state.xp);

    state.xp += xpGained;
    const newLevel = getLevel(state.xp);
    state.level = LEVELS.indexOf(newLevel);
    state.levelName = newLevel.name;

    const today = todayStr();
    if (state.lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        state.streak = state.lastActiveDate === yesterdayStr ? state.streak + 1 : 1;
        state.lastActiveDate = today;
    }

    if (!state.actions.includes(actionKey)) {
        state.actions.push(actionKey);
    }

    save(state);

    return { newXP: state.xp, xpGained, levelUp: oldLevel !== newLevel, state };
}

export function spendXP(amount: number): boolean {
    if (typeof window === "undefined") return false;
    try {
        const state = getGamification();
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

export function getDailyQuests(): DailyQuest[] {
    const state = getGamification();
    const today = new Date().getDay();

    const quests: DailyQuest[] = [
        { id: "log_expense", title: "Ghi 1 chi tiêu", description: "Mở Quỹ Chi tiêu và ghi 1 khoản", xp: 10, actionKey: "log_expense", completed: state.actions.includes("log_expense"), icon: "✏️" },
        { id: "check_market", title: "Xem thị trường", description: "Xem Nhiệt kế thị trường hôm nay", xp: 5, actionKey: "check_market", completed: state.actions.includes("check_market"), icon: "📊" },
    ];

    if (today === 1) {
        quests.push({ id: "review_budget", title: "Review ngân sách tuần mới", description: "Kiểm tra các hũ chi tiêu đầu tuần", xp: 15, actionKey: "setup_budget", completed: state.actions.includes("setup_budget"), icon: "📋" });
    }
    if (today === 5) {
        quests.push({ id: "read_macro", title: "Đọc tin kinh tế cuối tuần", description: "Xem xu hướng kinh tế vĩ mô", xp: 5, actionKey: "read_knowledge", completed: state.actions.includes("read_knowledge"), icon: "📰" });
    }

    return quests;
}

export function completeQuest(actionKey: string) {
    return addXP(actionKey);
}
