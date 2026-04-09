/* ═══════════════════════════════════════════════════════════
 * Typed localStorage accessors for all VietFi Advisor keys.
 * Server-safe: all operations are no-ops when window is absent.
 * ═══════════════════════════════════════════════════════════ */

import type { BudgetPot, Expense } from "@/lib/types/budget";
import type { DebtItem } from "@/lib/supabase/user-data";
import type { GamificationState } from "@/lib/gamification";
import type { OnboardingData } from "@/lib/onboarding-state";
import type { MarketSnapshot } from "@/lib/market-data/crawler";
import type { RiskResult } from "@/lib/calculations/risk-scoring";

export interface GoldPurchase {
  id: string;
  brand: string;      // "SJC", "BTMC", "DOJI", "PNJ", "Khác"
  type: string;       // "Vàng miếng", "Vàng nhẫn 9999"
  weight: number;     // Số chỉ (1 lượng = 10 chỉ)
  buyPrice: number;   // Giá mua vào trên MỘT CHỈ (VND)
  date: string;       // YYYY-MM-DD
}

/* ─── Reusable helpers ─── */

const isServer = typeof window === "undefined";

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getItem<T>(key: string, fallback: T): T {
  if (isServer) return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  return safeParseJSON<T>(raw) ?? fallback;
}

function setItem<T>(key: string, value: T): void {
  if (isServer) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or other error — fail silently
  }
}

function removeItem(key: string): void {
  if (isServer) return;
  localStorage.removeItem(key);
}

/* ─── Budget Pots ─── */

const POTS_KEY = "vietfi_pots";

export function getBudgetPots(): BudgetPot[] {
  return getItem<BudgetPot[]>(POTS_KEY, []);
}

export function setBudgetPots(pots: BudgetPot[]): void {
  setItem(POTS_KEY, pots);
}

/* ─── Expenses ─── */

const EXPENSES_KEY = "vietfi_expenses";

export function getExpenses(): Expense[] {
  return getItem<Expense[]>(EXPENSES_KEY, []);
}

export function setExpenses(expenses: Expense[]): void {
  setItem(EXPENSES_KEY, expenses);
}

/* ─── Income ─── */

const INCOME_KEY = "vietfi_income";

export function getIncome(): number {
  return getItem<number>(INCOME_KEY, 0);
}

export function setIncome(income: number): void {
  setItem(INCOME_KEY, income);
}

/* ─── Debts ─── */

const DEBTS_KEY = "vietfi_debts";

export function getDebts(): DebtItem[] {
  return getItem<DebtItem[]>(DEBTS_KEY, []);
}

export function setDebts(debts: DebtItem[]): void {
  setItem(DEBTS_KEY, debts);
}

/* ─── Gamification ─── */

const GAMIFICATION_KEY = "vietfi_gamification";

export function getGamificationState(): GamificationState | null {
  return getItem<GamificationState | null>(GAMIFICATION_KEY, null);
}

export function setGamificationState(state: GamificationState): void {
  setItem(GAMIFICATION_KEY, state);
}

export function clearGamificationState(): void {
  removeItem(GAMIFICATION_KEY);
}

/* ─── Onboarding ─── */

const ONBOARDING_KEY = "vietfi_onboarding";

export function getOnboardingState(): OnboardingData | null {
  return getItem<OnboardingData | null>(ONBOARDING_KEY, null);
}

export function setOnboardingState(state: OnboardingData): void {
  setItem(ONBOARDING_KEY, state);
}

export function clearOnboardingState(): void {
  removeItem(ONBOARDING_KEY);
}

/* ─── Market Cache ─── */

const MARKET_CACHE_KEY = "vietfi_market_cache";

export function getMarketCache(): MarketSnapshot | null {
  return getItem<MarketSnapshot | null>(MARKET_CACHE_KEY, null);
}

export function setMarketCache(snapshot: MarketSnapshot): void {
  setItem(MARKET_CACHE_KEY, snapshot);
}

const MARKET_ALERT_CACHE_KEY = "vietfi_market_alert_cache";

export function getMarketAlertCache(): Record<string, unknown> {
  return getItem<Record<string, unknown>>(MARKET_ALERT_CACHE_KEY, {});
}

export function setMarketAlertCache(cache: Record<string, unknown>): void {
  setItem(MARKET_ALERT_CACHE_KEY, cache);
}

/* ─── Sound ─── */

const SOUND_MUTED_KEY = "vietfi_sound_muted";

export function getSoundMuted(): boolean {
  if (isServer) return false;
  return localStorage.getItem(SOUND_MUTED_KEY) === "1";
}

export function setSoundMuted(muted: boolean): void {
  if (isServer) return;
  try {
    localStorage.setItem(SOUND_MUTED_KEY, muted ? "1" : "0");
  } catch {
    // fail silently
  }
}

/* ─── Market Alert Cache ─── */

const MARKET_ALERT_KEY = "vietfi_market_alert";

export interface MarketAlertCache {
  lastAlertTime: number;
  lastAlertMessage: string;
}

export function getMarketAlert(): MarketAlertCache | null {
  return getItem<MarketAlertCache | null>(MARKET_ALERT_KEY, null);
}

export function setMarketAlert(cache: MarketAlertCache): void {
  setItem(MARKET_ALERT_KEY, cache);
}
export interface SentimentHistoryEntry {
  date: string; // YYYY-MM-DD
  score: number;
  overallZone: string;
  topNews?: string[]; // New: store key news titles for this day
}

export interface SentimentDaily {
  date: string; // YYYY-MM-DD
  score: number;
  vnindex: number | null;
  goldPrice: number | null;
  overallZone: string;
  assetSentiment: Array<{ asset: string; score: number; trend: "up" | "down" | "neutral" }>;
  articleCount: number;
  topNews?: string[];
}

export interface SentimentHistory {
  entries: SentimentHistoryEntry[];
  yearlyHigh: { date: string; score: number } | null;
  yearlyLow: { date: string; score: number } | null;
}

const SENTIMENT_HISTORY_KEY = "vietfi_sentiment_history";

export function getSentimentHistory(): SentimentHistory {
  return getItem<SentimentHistory>(SENTIMENT_HISTORY_KEY, { entries: [], yearlyHigh: null, yearlyLow: null });
}

export function setSentimentHistory(history: SentimentHistory): void {
  setItem(SENTIMENT_HISTORY_KEY, history);
}

export function pushSentimentDay(entry: SentimentHistoryEntry): void {
  const existing = getSentimentHistory();
  const todayKey = entry.date.slice(0, 10);
  // Replace if today already exists, otherwise append
  const existingToday = existing.entries.findIndex((e) => e.date.slice(0, 10) === todayKey);
  let entries: SentimentHistoryEntry[];
  if (existingToday !== -1) {
    entries = existing.entries.map((e, i) => (i === existingToday ? entry : e));
  } else {
    entries = [...existing.entries, entry];
  }
  // Keep last 365 days
  if (entries.length > 365) {
    entries = entries.slice(-365);
  }
  // Update yearly extremes
  const allScores = entries.map((e) => e.score);
  const maxScore = Math.max(...allScores);
  const minScore = Math.min(...allScores);
  const yearlyHigh = existing.entries.find((e) => e.score === maxScore) ?? existing.yearlyHigh;
  const yearlyLow = existing.entries.find((e) => e.score === minScore) ?? existing.yearlyLow;
  // Recalculate extremes from current entries (not historical)
  const maxEntry = entries.find((e) => e.score === maxScore);
  const minEntry = entries.find((e) => e.score === minScore);
  setSentimentHistory({ entries, yearlyHigh: maxEntry ? { date: maxEntry.date, score: maxEntry.score } : null, yearlyLow: minEntry ? { date: minEntry.date, score: minEntry.score } : null });
}

/* ─── Notification Dismissed ─── */

const NOTIF_DISMISSED_KEY = "vietfi_notif_dismissed";

export function getNotifDismissed(): boolean {
  return getItem<boolean>(NOTIF_DISMISSED_KEY, false);
}

export function setNotifDismissed(dismissed: boolean): void {
  setItem(NOTIF_DISMISSED_KEY, dismissed);
}

/* ─── Lessons Done ─── */

const LESSONS_DONE_KEY = "vietfi_lessons_done";

export function getLessonsDone(): string[] {
  return getItem<string[]>(LESSONS_DONE_KEY, []);
}

export function setLessonsDone(lessons: string[]): void {
  setItem(LESSONS_DONE_KEY, lessons);
}

/* ─── Risk Result ─── */

const RISK_RESULT_KEY = "vietfi_risk_result";

export function getRiskResult(): RiskResult | null {
  return getItem<RiskResult | null>(RISK_RESULT_KEY, null);
}

export function setRiskResult(result: RiskResult): void {
  setItem(RISK_RESULT_KEY, result);
}

/* ─── Streak Freeze ─── */

/**
 * Streak freeze state — auto-grants 1 freeze/week, max stockpile of 3.
 * Shape must match the FreezeState interface in WeeklyReport.tsx.
 */
export interface StreakFreezeState {
  freezesAvailable: number;
  lastFreeWeek: string; // ISO week string (e.g. "2026-W12")
  usedThisWeek: boolean;
}

const STREAK_FREEZE_KEY = "vietfi_streak_freeze";

export function getStreakFreeze(): StreakFreezeState | null {
  return getItem<StreakFreezeState | null>(STREAK_FREEZE_KEY, null);
}

export function setStreakFreeze(state: StreakFreezeState): void {
  setItem(STREAK_FREEZE_KEY, state);
}

/* ─── Leaderboard Offsets ─── */

const LEADERBOARD_OFFSETS_KEY = "vietfi_leaderboard_offsets";

export function getLeaderboardOffsets(): Record<string, number> {
  return getItem<Record<string, number>>(LEADERBOARD_OFFSETS_KEY, {});
}

export function setLeaderboardOffsets(offsets: Record<string, number>): void {
  setItem(LEADERBOARD_OFFSETS_KEY, offsets);
}

/* ─── Leaderboard Bot Offsets (weekly) ─── */
export function getLeaderboardBots(weekId: string): number[] {
  return getItem<number[]>(`vietfi_leaderboard_bots_${weekId}`, []);
}

export function setLeaderboardBots(weekId: string, offsets: number[]): void {
  setItem(`vietfi_leaderboard_bots_${weekId}`, offsets);
}

export function getLeaderboardBaseline(weekId: string): number {
  return getItem<number>(`vietfi_leaderboard_baseline_${weekId}`, 0);
}

export function setLeaderboardBaseline(weekId: string, baseline: number): void {
  setItem(`vietfi_leaderboard_baseline_${weekId}`, baseline);
}

/* ─── Premium State ─── */
import type { PremiumState } from "@/lib/premium";

const PREMIUM_KEY = "vietfi_premium_state";

export function getPremiumStateLS(): PremiumState | null {
  return getItem<PremiumState | null>(PREMIUM_KEY, null);
}

export function setPremiumStateLS(state: PremiumState): void {
  setItem(PREMIUM_KEY, state);
}

/* ─── News Bookmarks ─── */

const NEWS_BOOKMARKS_KEY = "vietfi_news_bookmarks";

export function getNewsBookmarks(): Set<string> {
  const arr = getItem<string[]>(NEWS_BOOKMARKS_KEY, []);
  return new Set(arr);
}

export function setNewsBookmarks(bookmarks: Set<string>): void {
  setItem(NEWS_BOOKMARKS_KEY, Array.from(bookmarks));
}

/* ─── Gold Purchases (Physical Gold Tracker) ─── */

const GOLD_KEY = "vietfi_gold_purchases";

export function getGoldPurchases(): GoldPurchase[] {
  return getItem<GoldPurchase[]>(GOLD_KEY, []);
}

export function setGoldPurchases(data: GoldPurchase[]): void {
  setItem(GOLD_KEY, data);
}

export function addGoldPurchase(data: Omit<GoldPurchase, "id">): void {
  const current = getGoldPurchases();
  current.push({ ...data, id: Date.now().toString() });
  setGoldPurchases(current);
}

export function deleteGoldPurchase(id: string): void {
  const current = getGoldPurchases();
  setGoldPurchases(current.filter((g) => g.id !== id));
}

/* ─── Ledger Entries ─── */

export interface LedgerEntry {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  note: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO datetime string
}

const LEDGER_KEY = "vietfi_ledger";

export function getLedgerEntries(): LedgerEntry[] {
  return getItem<LedgerEntry[]>(LEDGER_KEY, []);
}

export function setLedgerEntries(entries: LedgerEntry[]): void {
  setItem(LEDGER_KEY, entries);
}

/* ─── Clear All User Data ─── */

const ALL_USER_KEYS = [
  POTS_KEY,
  EXPENSES_KEY,
  INCOME_KEY,
  DEBTS_KEY,
  GAMIFICATION_KEY,
  ONBOARDING_KEY,
  LESSONS_DONE_KEY,
  STREAK_FREEZE_KEY,
  RISK_RESULT_KEY,
  NEWS_BOOKMARKS_KEY,
  SOUND_MUTED_KEY,
  GOLD_KEY,
  PREMIUM_KEY,
];

export function clearAllUserData(): void {
  for (const key of ALL_USER_KEYS) {
    removeItem(key);
  }
}
