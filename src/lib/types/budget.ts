/**
 * Shared budget domain types — used by budget pots and expenses.
 * Extracted from src/app/dashboard/budget/page.tsx.
 */

/**
 * A single budget pot (hũ) — tracks allocated monthly budget per category.
 * Fields:
 *   id          — unique identifier
 *   name        — display name (e.g. "Ăn uống")
 *   iconKey     — Lucide icon component name (e.g. "Coffee", "ShoppingBag")
 *   allocated   — monthly budget in VND
 *   color       — hex color for UI accent
 *   sort_order  — optional display order
 */
export interface BudgetPot {
  id: string;
  name: string;
  iconKey: string;
  allocated: number;
  color: string;
  sort_order?: number;
}

/**
 * A logged expense (chi tiêu) tied to a budget pot.
 * Fields:
 *   id         — unique identifier
 *   pot_id     — id of the BudgetPot this expense belongs to
 *   amount     — amount in VND
 *   note       — optional description (e.g. "Trà sữa Phúc Long")
 *   category   — optional category label (e.g. "Ăn uống")
 *   created_at — ISO timestamp
 */
export interface Expense {
  id: string;
  /** Snake-case — used by user-data.ts (Supabase columns) */
  pot_id?: string | null;
  /** Camel-case — used by budget/page.tsx */
  potId?: string;
  amount: number;
  note?: string;
  /** Required by budget/page.tsx (always provided on creation) */
  date: string;
  category?: string;
  /** Snake-case — used by user-data.ts (Supabase column) */
  created_at?: string;
}
