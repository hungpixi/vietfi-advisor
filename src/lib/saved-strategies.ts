/**
 * Saved Strategies — localStorage CRUD
 *
 * Cho phép user lưu cấu hình backtest của riêng họ.
 * Follow pattern của src/lib/storage.ts (server-safe, typed).
 *
 * Key: "vietfi_saved_strategies"
 * Max: 20 strategies per user (tránh localStorage overflow)
 */

import type { Strategy } from "@/lib/market-data/backtest-engine";

/* ─── Types ─── */

export interface SavedStrategy {
    id: string;              // UUID viết tắt (Date.now + random)
    name: string;            // Tên user đặt (VD: "FPT Breakout 2022")
    ticker: string;          // Mã CK
    fromDate: string;        // YYYY-MM-DD
    toDate: string;          // YYYY-MM-DD
    capital: number;         // VND
    strategy: Strategy;      // "buy-and-hold" | "sma-cross" | "breakout-52w" | "ma30w-stage2"
    smaFast?: number;
    smaSlow?: number;
    guruId?: string;         // Nếu từ Guru preset
    savedAt: string;         // ISO timestamp
    lastMetrics?: {          // Cache kết quả lần chạy cuối
        cagr: number;
        totalReturn: number;
        sharpe: number;
        maxDrawdown: number;
        winRate: number;
        numTrades: number;
        finalCapital: number;
    };
}

/* ─── Constants ─── */

const STORAGE_KEY = "vietfi_saved_strategies";
const MAX_STRATEGIES = 20;

/* ─── Helpers (server-safe) ─── */

const isServer = typeof window === "undefined";

function loadAll(): SavedStrategy[] {
    if (isServer) return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown[];
        // Basic validation: phải là array
        return Array.isArray(parsed) ? (parsed as SavedStrategy[]) : [];
    } catch {
        return [];
    }
}

function saveAll(strategies: SavedStrategy[]): void {
    if (isServer) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
    } catch {
        // localStorage full — fail silently
    }
}

function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ─── CRUD ─── */

/** Lấy tất cả saved strategies, sort mới nhất trước */
export function getSavedStrategies(): SavedStrategy[] {
    return loadAll().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Lưu strategy mới. Trả về ID nếu thành công, null nếu đầy */
export function saveStrategy(
    data: Omit<SavedStrategy, "id" | "savedAt">
): SavedStrategy | null {
    const all = loadAll();
    if (all.length >= MAX_STRATEGIES) return null; // Đầy rồi

    const strategy: SavedStrategy = {
        ...data,
        id: generateId(),
        savedAt: new Date().toISOString(),
    };
    all.push(strategy);
    saveAll(all);
    return strategy;
}

/** Cập nhật lastMetrics sau khi chạy backtest */
export function updateStrategyMetrics(
    id: string,
    metrics: SavedStrategy["lastMetrics"]
): void {
    const all = loadAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx].lastMetrics = metrics;
    saveAll(all);
}

/** Xóa strategy theo ID */
export function deleteStrategy(id: string): void {
    const all = loadAll().filter((s) => s.id !== id);
    saveAll(all);
}

/** Đổi tên strategy */
export function renameStrategy(id: string, name: string): void {
    const all = loadAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx].name = name;
    saveAll(all);
}

/** Kiểm tra xem strategy đã tồn tại chưa (tránh duplicate) */
export function isDuplicateStrategy(
    ticker: string,
    strategy: Strategy,
    fromDate: string,
    toDate: string
): boolean {
    return loadAll().some(
        (s) =>
            s.ticker === ticker &&
            s.strategy === strategy &&
            s.fromDate === fromDate &&
            s.toDate === toDate
    );
}
