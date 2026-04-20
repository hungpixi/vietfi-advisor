import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number or string into a string with thousand separators (commas).
 * Example: 1000000 -> "1,000,000"
 */
export function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  const numString = val.toString().replace(/\D/g, "");
  if (!numString) return "";
  return parseInt(numString).toLocaleString("en-US");
}

/**
 * Parses a string with thousand separators into a raw number.
 * Example: "1,000,000" -> 1000000
 */
export function parseNumber(val: string): number {
  return parseInt(val.replace(/\D/g, "")) || 0;
}
