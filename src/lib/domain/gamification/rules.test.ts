/**
 * Unit Tests — Domain: Gamification Rules
 *
 * Testing pure domain functions only: no I/O, no framework, no mocks.
 */

import { describe, it, expect } from "vitest";
import {
    getRoleFromXP,
    hasRole,
    getLevel,
    getLevelProgress,
    validateGamification,
    LEVELS,
    ROLE_THRESHOLDS,
    UserRole,
} from "./rules";

// ── getRoleFromXP ──────────────────────────────────────────────────────

describe("getRoleFromXP", () => {
    it("returns MEMBER for 0 XP", () => {
        expect(getRoleFromXP(0)).toBe(UserRole.MEMBER);
    });

    it("returns MEMBER for 299 XP (boundary)", () => {
        expect(getRoleFromXP(299)).toBe(UserRole.MEMBER);
    });

    it("returns PRO at exactly 300 XP", () => {
        expect(getRoleFromXP(300)).toBe(UserRole.PRO);
    });

    it("returns MASTER at exactly 1000 XP", () => {
        expect(getRoleFromXP(1000)).toBe(UserRole.MASTER);
    });

    it("returns LEGEND at exactly 2000 XP", () => {
        expect(getRoleFromXP(2000)).toBe(UserRole.LEGEND);
    });

    it("returns LEGEND for very high XP", () => {
        expect(getRoleFromXP(999_999)).toBe(UserRole.LEGEND);
    });
});

// ── hasRole ─────────────────────────────────────────────────────────────

describe("hasRole", () => {
    it("MEMBER (0 XP) does not have PRO", () => {
        expect(hasRole(0, UserRole.PRO)).toBe(false);
    });

    it("PRO (300 XP) has MEMBER access", () => {
        expect(hasRole(300, UserRole.MEMBER)).toBe(true);
    });

    it("MASTER (1000 XP) has PRO access", () => {
        expect(hasRole(1000, UserRole.PRO)).toBe(true);
    });

    it("LEGEND (2000 XP) has all roles", () => {
        expect(hasRole(2000, UserRole.MASTER)).toBe(true);
        expect(hasRole(2000, UserRole.PRO)).toBe(true);
        expect(hasRole(2000, UserRole.MEMBER)).toBe(true);
    });
});

// ── getLevel ─────────────────────────────────────────────────────────────

describe("getLevel", () => {
    it("returns first level for 0 XP", () => {
        expect(getLevel(0)).toBe(LEVELS[0]);
    });

    it("returns correct level at boundary", () => {
        expect(getLevel(200)).toBe(LEVELS[1]); // Vẹt Trưởng thành
    });

    it("returns max level for very high XP", () => {
        expect(getLevel(9999)).toBe(LEVELS[LEVELS.length - 1]);
    });
});

// ── getLevelProgress ──────────────────────────────────────────────────────

describe("getLevelProgress", () => {
    it("returns 100% and no next level at max level", () => {
        const result = getLevelProgress(9999);
        expect(result.progress).toBe(100);
        expect(result.next).toBeNull();
        expect(result.xpToNext).toBe(0);
    });

    it("calculates correct progress between levels", () => {
        // Level 0→1: 0→200. At xp=100: 50%
        const result = getLevelProgress(100);
        expect(result.progress).toBe(50);
        expect(result.xpToNext).toBe(100);
    });
});

// ── validateGamification ──────────────────────────────────────────────────

describe("validateGamification", () => {
    it("returns null for null input", () => {
        expect(validateGamification(null)).toBeNull();
    });

    it("returns null for string input", () => {
        expect(validateGamification("hello")).toBeNull();
    });

    it("returns null for negative xp", () => {
        expect(validateGamification({ xp: -1, level: 0, streak: 0, levelName: "", lastActiveDate: "", actions: [] })).toBeNull();
    });

    it("returns valid object for correct input", () => {
        const input = { xp: 100, level: 0, streak: 3, levelName: "Vẹt Teen", lastActiveDate: "2026-04-17", actions: ["log_expense"], questCompleted: false };
        const result = validateGamification(input);
        expect(result).not.toBeNull();
        expect(result?.xp).toBe(100);
        expect(result?.streak).toBe(3);
    });

    it("clamps xp to 1_000_000 max", () => {
        const input = { xp: 9_999_999, level: 4, streak: 0, levelName: "", lastActiveDate: "", actions: [] };
        const result = validateGamification(input);
        expect(result?.xp).toBe(1_000_000);
    });

    it("clamps streak to 365 max", () => {
        const input = { xp: 0, level: 0, streak: 999, levelName: "", lastActiveDate: "", actions: [] };
        const result = validateGamification(input);
        expect(result?.streak).toBe(365);
    });
});

// ── ROLE_THRESHOLDS sanity check ──────────────────────────────────────────

describe("ROLE_THRESHOLDS", () => {
    it("thresholds match getRoleFromXP boundaries", () => {
        expect(getRoleFromXP(ROLE_THRESHOLDS[UserRole.PRO])).toBe(UserRole.PRO);
        expect(getRoleFromXP(ROLE_THRESHOLDS[UserRole.MASTER])).toBe(UserRole.MASTER);
        expect(getRoleFromXP(ROLE_THRESHOLDS[UserRole.LEGEND])).toBe(UserRole.LEGEND);
    });
});
