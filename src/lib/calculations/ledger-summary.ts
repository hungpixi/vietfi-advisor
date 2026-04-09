/**
 * Pure ledger summary calculation — no side effects, no store dependencies.
 */

export interface LedgerEntry {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  note: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO datetime string
}

export interface LedgerSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(dateStr: string): Date {
  // dateStr is YYYY-MM-DD; use T00:00:00 to avoid timezone shift
  return new Date(`${dateStr}T00:00:00`);
}

export function computeLedgerSummary(
  entries: LedgerEntry[],
  period: "today" | "month"
): LedgerSummary {
  const now = new Date();
  const periodStart = period === "today" ? startOfToday() : startOfMonth();

  let totalIncome = 0;
  let totalExpense = 0;

  for (const entry of entries) {
    const entryDate = parseDate(entry.date);
    if (entryDate < periodStart || entryDate > now) continue;

    if (entry.type === "income") {
      totalIncome += entry.amount;
    } else {
      totalExpense += entry.amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    transactionCount: entries.filter((e) => {
      const d = parseDate(e.date);
      return d >= periodStart && d <= now;
    }).length,
  };
}
