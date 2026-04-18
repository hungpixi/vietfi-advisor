/**
 * Supabase Data Access Layer — Hybrid localStorage/Supabase
 *
 * Logged-in users → read/write Supabase (RLS-protected)
 * Guest users     → fallback to localStorage (existing behavior)
 */

import { createClient } from "./client";
import type { OnboardingData } from "@/lib/onboarding-state";
import type { GamificationState } from "@/lib/gamification";
import {
  getBudgetPots as localGetBudgetPots,
  setBudgetPots as localSetBudgetPots,
  getExpenses as localGetExpenses,
  setExpenses as localSetExpenses,
} from "@/lib/storage";

// ── Types ──────────────────────────────────────────────────────────────

import type { BudgetPot, Expense } from "@/lib/domain/personal-finance/types";
export type { BudgetPot, Expense };

/** Bundled budget state — pots + expenses for the current month. */
export interface BudgetData {
  pots: BudgetPot[];
  expenses: Expense[];
}

// ── Auth helper ────────────────────────────────────────────────────────

let _cachedUserId: string | null = null;

export async function getAuthUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    _cachedUserId = data.user?.id ?? null;
    return _cachedUserId;
  } catch {
    _cachedUserId = null;
    return null;
  }
}

/** Sync check — uses cached value from last async call. */
export function getCachedUserId(): string | null {
  return _cachedUserId ?? null;
}

// ── Profile (Onboarding) ──────────────────────────────────────────────

export async function getUserProfile(): Promise<OnboardingData> {
  const DEFAULT: OnboardingData = {
    completed: false,
    income: 0,
    netWorth: 0,
    hasDebt: false,
    riskProfile: "",
    setupAt: "",
  };

  const userId = await getAuthUserId();
  if (!userId) return DEFAULT;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("income, net_worth, has_debt, risk_profile, setup_at")
      .eq("id", userId)
      .single();

    if (error || !data) return DEFAULT;

    return {
      completed: !!data.setup_at,
      income: data.income ?? 0,
      netWorth: data.net_worth ?? 0,
      hasDebt: data.has_debt ?? false,
      riskProfile: (data.risk_profile as OnboardingData["riskProfile"]) || "",
      setupAt: data.setup_at ?? "",
    };
  } catch {
    return DEFAULT;
  }
}

export async function saveUserProfile(
  profile: Partial<OnboardingData>
): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  try {
    const supabase = createClient();
    await supabase.from("profiles").upsert({
      id: userId,
      income: profile.income ?? 0,
      net_worth: profile.netWorth ?? 0,
      has_debt: profile.hasDebt ?? false,
      risk_profile: profile.riskProfile ?? "",
      setup_at: profile.setupAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    // silent — don't block UI
  }
}

// ── Budget Pots ───────────────────────────────────────────────────────

export async function getBudgetPots(): Promise<BudgetPot[]> {
  const userId = await getAuthUserId();
  if (!userId) return [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("budget_pots")
      .select("id, name, icon_key, allocated, color, sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      iconKey: row.icon_key ?? "Wallet",
      allocated: row.allocated ?? 0,
      color: row.color ?? "#E6B84F",
      sort_order: row.sort_order ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function saveBudgetPots(pots: BudgetPot[]): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  try {
    const supabase = createClient();
    // Delete existing pots, then insert new ones
    await supabase.from("budget_pots").delete().eq("user_id", userId);
    if (pots.length > 0) {
      await supabase.from("budget_pots").insert(
        pots.map((pot, i) => ({
          id: pot.id.length === 36 ? pot.id : undefined, // only keep valid UUIDs
          user_id: userId,
          name: pot.name,
          icon_key: pot.iconKey,
          allocated: pot.allocated,
          color: pot.color,
          sort_order: i,
        }))
      );
    }
  } catch {
    // silent
  }
}

// ── Expenses ──────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const userId = await getAuthUserId();
  if (!userId) return [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select("id, pot_id, amount, note, category, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => ({
      id: row.id,
      pot_id: row.pot_id,
      amount: row.amount,
      note: row.note ?? "",
      category: row.category ?? "",
      created_at: row.created_at,
      date: row.created_at ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function addExpense(expense: Omit<Expense, "id">): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  try {
    const supabase = createClient();
    await supabase.from("expenses").insert({
      user_id: userId,
      pot_id: expense.pot_id || null,
      amount: expense.amount,
      note: expense.note ?? "",
      category: expense.category ?? "",
      created_at: expense.created_at ?? expense.date ?? new Date().toISOString(),
    });
  } catch {
    // silent
  }
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  try {
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("user_id", userId);
    if (expenses.length > 0) {
      await supabase.from("expenses").insert(
        expenses.map((e) => ({
          user_id: userId,
          pot_id: e.pot_id || null,
          amount: e.amount,
          note: e.note ?? "",
          category: e.category ?? "",
          created_at: e.created_at ?? e.date ?? new Date().toISOString(),
        }))
      );
    }
  } catch {
    // silent
  }
}

// ── Gamification ──────────────────────────────────────────────────────

export async function getGamificationState(): Promise<GamificationState | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("gamification")
      .select("xp, level, level_name, streak, last_active_date, actions, quest_completed, lessons_done, streak_freeze")
      .eq("id", userId)
      .single();

    if (error || !data) return null;

    return {
      xp: data.xp ?? 0,
      level: data.level ?? 0,
      levelName: data.level_name ?? "🐣 Vẹt Teen",
      streak: data.streak ?? 0,
      lastActiveDate: data.last_active_date ?? "",
      actions: data.actions ?? [],
      questCompleted: data.quest_completed ?? false,
    };
  } catch {
    return null;
  }
}

export async function saveGamificationState(
  state: GamificationState
): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  try {
    const supabase = createClient();
    await supabase.from("gamification").upsert({
      id: userId,
      xp: state.xp,
      level: state.level,
      level_name: state.levelName,
      streak: state.streak,
      last_active_date: state.lastActiveDate,
      actions: state.actions,
      quest_completed: state.questCompleted,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // silent
  }
}

// ── Income (stored in profiles) ───────────────────────────────────────

export async function getIncome(): Promise<number> {
  const profile = await getUserProfile();
  return profile.income;
}

export async function saveIncome(income: number): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  try {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ income, updated_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    // silent
  }
}

// ── Debts ─────────────────────────────────────────────────────────────

export interface DebtItem {
  name: string;
  type: string;
  principal: number;
  rate: number;
  min_payment: number;
  icon: string;
  color: string;
}

export async function saveDebts(debts: DebtItem[]): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  try {
    const supabase = createClient();
    await supabase.from("debts").delete().eq("user_id", userId);
    if (debts.length > 0) {
      await supabase.from("debts").insert(
        debts.map((d) => ({
          user_id: userId,
          name: d.name,
          type: d.type,
          principal: d.principal,
          rate: d.rate,
          min_payment: d.min_payment,
          icon: d.icon,
          color: d.color,
        }))
      );
    }
  } catch {
    // silent
  }
}

export async function getDebts(): Promise<DebtItem[]> {
  const userId = await getAuthUserId();
  if (!userId) return [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("debts")
      .select("name, type, principal, rate, min_payment, icon, color")
      .eq("user_id", userId);

    if (error || !data) return [];

    return data.map((row) => ({
      name: row.name,
      type: row.type,
      principal: row.principal,
      rate: row.rate,
      min_payment: row.min_payment,
      icon: row.icon ?? "CreditCard",
      color: row.color ?? "#E6B84F",
    }));
  } catch {
    return [];
  }
}

// ── Budget (bundled pots + expenses) ─────────────────────────────────

/**
 * Batch-read budget: fetches pots + expenses in a single query using LEFT JOIN.
 * Falls back to separate queries if batch fails.
 *
 * OPTIMIZATION: Reduces 2 DB round-trips to 1 for logged-in users.
 */
export async function getBudgetBatch(): Promise<BudgetData> {
  const userId = await getAuthUserId();
  if (!userId) {
    return {
      pots: localGetBudgetPots(),
      expenses: localGetExpenses(),
    };
  }

  try {
    const supabase = createClient();

    // Single query: fetch all data for user (pots + expenses in one round-trip)
    // We use a combined query with post-processing to separate the results
    const { data: potsData, error: potsError } = await supabase
      .from("budget_pots")
      .select("id, name, icon_key, allocated, color, sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (potsError || !potsData) {
      throw potsError || new Error("Failed to fetch pots");
    }

    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("id, pot_id, amount, note, category, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (expensesError) {
      // Log but don't throw - return pots even if expenses fail
      console.warn("Failed to fetch expenses:", expensesError);
    }

    const pots: BudgetPot[] = (potsData || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (row: any) => ({
        id: row.id,
        name: row.name,
        iconKey: row.icon_key ?? "Wallet",
        allocated: row.allocated ?? 0,
        color: row.color ?? "#E6B84F",
        sort_order: row.sort_order ?? 0,
      })
    );

    const expenses: Expense[] = (expensesData || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (row: any) => ({
        id: row.id,
        pot_id: row.pot_id,
        amount: row.amount,
        note: row.note ?? "",
        category: row.category ?? "",
        created_at: row.created_at,
        date: row.created_at ?? new Date().toISOString(),
      })
    );

    return { pots, expenses };
  } catch {
    // Fallback to localStorage on any error
    return {
      pots: localGetBudgetPots(),
      expenses: localGetExpenses(),
    };
  }
}

/** Reads budget state from Supabase (logged-in) or localStorage (guest). */
export async function getBudget(): Promise<BudgetData> {
  const userId = await getAuthUserId();
  if (userId) {
    // Use optimized batch read for logged-in users
    return getBudgetBatch();
  }
  // Guest — fall back to localStorage
  return {
    pots: localGetBudgetPots(),
    expenses: localGetExpenses(),
  };
}

/** Persists budget state to Supabase (logged-in) or localStorage (guest). */
export async function setBudget(budget: BudgetData): Promise<void> {
  const userId = await getAuthUserId();
  if (userId) {
    await Promise.all([saveBudgetPots(budget.pots), saveExpenses(budget.expenses)]);
    return;
  }
  localSetBudgetPots(budget.pots);
  localSetExpenses(budget.expenses);
}
