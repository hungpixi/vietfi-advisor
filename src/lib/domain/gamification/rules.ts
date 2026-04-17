/**
 * Gamification Domain Rules
 *
 * Pure domain logic: XP table, level definitions, RBAC roles.
 * No I/O, no framework, no imports — safe to use anywhere.
 * Extracted from src/lib/gamification.ts and src/lib/rbac.ts
 */

// ── Enums & Role definitions ─────────────────────────────────────────────────

export enum UserRole {
    MEMBER = "MEMBER", // 0 - 299 XP
    PRO = "PRO",       // 300 - 999 XP
    MASTER = "MASTER", // 1000 - 1999 XP
    LEGEND = "LEGEND", // 2000+ XP
}

const ROLE_RANKS: Record<UserRole, number> = {
    [UserRole.MEMBER]: 0,
    [UserRole.PRO]: 1,
    [UserRole.MASTER]: 2,
    [UserRole.LEGEND]: 3,
};

export const ROLE_THRESHOLDS = {
    [UserRole.MEMBER]: 0,
    [UserRole.PRO]: 300,
    [UserRole.MASTER]: 1000,
    [UserRole.LEGEND]: 2000,
};

export const ROLE_DESCRIPTIONS = {
    [UserRole.MEMBER]: "Học viên Vẹt",
    [UserRole.PRO]: "Nhà đầu tư nghiêm túc",
    [UserRole.MASTER]: "Chuyên gia lướt sóng",
    [UserRole.LEGEND]: "Huyền thoại VietFi",
};

export function getRoleFromXP(xp: number): UserRole {
    if (xp >= 2000) return UserRole.LEGEND;
    if (xp >= 1000) return UserRole.MASTER;
    if (xp >= 300) return UserRole.PRO;
    return UserRole.MEMBER;
}

export function hasRole(currentXp: number, requiredRole: UserRole): boolean {
    const currentRole = getRoleFromXP(currentXp);
    return ROLE_RANKS[currentRole] >= ROLE_RANKS[requiredRole];
}

// ── XP Table ──────────────────────────────────────────────────────────────────

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
    run_backtest: 30,
};

// ── Level definitions ─────────────────────────────────────────────────────────

export interface LevelDefinition {
    min: number;
    name: string;
    emoji: string;
}

export const LEVELS: LevelDefinition[] = [
    { min: 0, name: "🐣 Vẹt Teen", emoji: "🐣" },
    { min: 200, name: "🦜 Vẹt Trưởng thành", emoji: "🦜" },
    { min: 500, name: "⭐ Vẹt Pro", emoji: "⭐" },
    { min: 1000, name: "👑 Vẹt Master", emoji: "👑" },
    { min: 2000, name: "💎 Đại Gia", emoji: "💎" },
];

export function getLevel(xp: number): LevelDefinition {
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

// ── Gamification State ────────────────────────────────────────────────────────

export interface GamificationState {
    xp: number;
    level: number;
    levelName: string;
    streak: number;
    lastActiveDate: string;
    actions: string[];
    questCompleted: boolean;
}

export const DEFAULT_GAMIFICATION_STATE: GamificationState = {
    xp: 0,
    level: 0,
    levelName: "🐣 Vẹt Teen",
    streak: 0,
    lastActiveDate: "",
    actions: [],
    questCompleted: false,
};

// ── Schema validation (prevent localStorage tampering) ───────────────────────

export function validateGamification(raw: unknown): Partial<GamificationState> | null {
    if (typeof raw !== "object" || raw === null) return null;
    const s = raw as Record<string, unknown>;

    if (typeof s.xp !== "number" || !Number.isFinite(s.xp) || s.xp < 0) return null;
    if (typeof s.level !== "number" || !Number.isInteger(s.level) || s.level < 0) return null;
    if (typeof s.streak !== "number" || !Number.isInteger(s.streak) || s.streak < 0) return null;
    if (typeof s.levelName !== "string") return null;
    if (typeof s.lastActiveDate !== "string") return null;
    if (!Array.isArray(s.actions)) return null;

    const xp = Math.min(Math.max(s.xp, 0), 1_000_000);
    const streak = Math.min(Math.max(s.streak, 0), 365);
    const level = Math.min(Math.max(s.level, 0), LEVELS.length - 1);

    return {
        xp, level, streak,
        levelName: s.levelName,
        lastActiveDate: s.lastActiveDate,
        actions: s.actions,
        questCompleted: !!s.questCompleted,
    };
}
