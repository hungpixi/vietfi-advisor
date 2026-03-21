/**
 * Vietnamese-format number parser and regex extractors.
 * Used by all market data crawlers to parse SBV pages, news sites, and APIs.
 */

export interface RangeOptions {
  min: number
  max: number
}

/**
 * Parse Vietnamese-formatted float: '18.815.882,09' → 18815882.09
 * Remove thousand dots, replace decimal comma with period.
 * Handles: '3,5', '1.234,56', '18.815.882,09', '3.5', '1234.56'
 */
export function parseVnFloat(s: string): number {
  if (!s) return NaN
  // Comma present → Vietnamese format:
  //   "3,5"         → 3.5
  //   "1.234,56"    → dots=thousands, comma=decimal → 1234.56
  //   "18.815.882,09" → dots=thousands, comma=decimal → 18815882.09
  // No comma → English/standard format:
  //   "54.3"        → 54.3 (decimal dot)
  //   "3.5"         → 3.5
  if (s.includes(',')) {
    // Remove all dots (thousand separators) and replace comma with period
    const normalized = s.replace(/\./g, '').replace(',', '.')
    return Number.isNaN(parseFloat(normalized)) ? NaN : parseFloat(normalized)
  }
  // No comma — treat dot as decimal
  const v = parseFloat(s)
  return Number.isNaN(v) ? NaN : v
}

/**
 * Extract the first number in `text` that falls within [min, max].
 * Returns null if no number in range is found.
 *
 * `currencyMode`: when true, treats dot as thousand-separator (Vietnamese
 * currency formatting: "25.085 VND" → 25085). Use when `min` ≥ 10000.
 */
export function extractNumber(
  text: string,
  opts?: RangeOptions,
  currencyMode = false,
): number | null {
  if (!text) return null

  // Match groups of digits with optional commas/periods (but not %)
  const numbers = text.match(/[\d][\d,.]*[\d]|[\d]/g)
  if (!numbers) return null

  for (const raw of numbers) {
    let v: number
    if (currencyMode) {
      // Strip all dots (thousand separators) then replace comma with period
      v = parseVnFloat(raw.replace(/\./g, ''))
    } else {
      v = parseVnFloat(raw)
    }
    if (!Number.isNaN(v)) {
      if (!opts) return v
      if (v >= opts.min && v <= opts.max) return v
    }
  }

  return null
}

// --- Pattern sets -----------------------------------------------------------

/** Credit growth: number followed by % (Vietnamese format) */
const CREDIT_PATTERNS = [
  // 'tăng trưởng tín dụng' followed (anywhere after) by number%
  /tăng trưởng tín dụng[^%\d]*([\d]+[,][\d]+|[1-9]\d*)[^\d]*%/i,
  /tang truong tin dung[^%\d]*([\d]+[.,][\d]+)[^\d]*%/i,
  // number% with credit growth keywords anywhere
  /([\d]+[.,][\d]+)\s*%\s*[^%]*?(?:tăng trưởng|tang truong)/i,
  // credit growth followed by percentage
  /tăng trưởng\s*(?:tín dụng|tin dung)[^\d]*([\d]+[,][\d]+)\s*%/i,
]

/** PMI: "PMI" or "Vietnam PMI" followed by number */
const PMI_PATTERNS = [
  /(?:Vietnam\s+)?Manufacturing\s+PMI\s+([1-5]\d[.,]\d)/i,
  /(?:Vietnam\s+)?PMI\s+([1-5]\d[.,]\d)/i,
]

/** Rate: Lãi suất followed by number-% */
const RATE_PATTERNS = [
  /Lãi suất[^%\d]*([\d]+[.,][\d]+)\s*%/i,
  /lai suat[^%\d]*([\d]+[.,][\d]+)\s*%/i,
]

type PatternSet = RegExp[]

function applyPatterns(text: string, patterns: PatternSet, opts: RangeOptions): number | null {
  for (const pat of patterns) {
    const m = pat.exec(text)
    if (!m) continue
    // Try capture group 2 first (number in two-group patterns), then group 1
    const raw = m[2] ?? m[1] ?? m[0]
    const v = parseVnFloat(raw)
    if (!Number.isNaN(v) && v >= opts.min && v <= opts.max) return v
  }
  return null
}

/**
 * Extract a credit-growth-like value from text.
 */
export function extractCreditGrowth(text: string, opts: RangeOptions): number | null {
  return applyPatterns(text, CREDIT_PATTERNS, opts)
}

/**
 * Extract a PMI-like value from text.
 */
export function extractPMI(text: string, opts: RangeOptions): number | null {
  return applyPatterns(text, PMI_PATTERNS, opts)
}

/**
 * Extract a rate-like value from text.
 */
export function extractRate(text: string, opts: RangeOptions): number | null {
  return applyPatterns(text, RATE_PATTERNS, opts)
}

/**
 * Try multiple regex patterns against `text` and return the first number
 * that falls within [min, max]. Returns null if none match.
 * Combines credit + PMI + rate patterns.
 */
export function extractRange(text: string, opts: RangeOptions): number | null {
  return (
    applyPatterns(text, CREDIT_PATTERNS, opts) ??
    applyPatterns(text, PMI_PATTERNS, opts) ??
    applyPatterns(text, RATE_PATTERNS, opts)
  )
}
