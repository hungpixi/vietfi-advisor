import { describe, it, expect } from 'vitest'
import { parseVnFloat, extractNumber, extractRange, extractCreditGrowth, extractPMI } from './parser'

describe('parseVnFloat', () => {
  it('parses Vietnamese comma decimal: 3,5 → 3.5', () => {
    expect(parseVnFloat('3,5')).toBe(3.5)
  })

  it('parses Vietnamese thousand-dot + comma-decimal: 1.234,56 → 1234.56', () => {
    expect(parseVnFloat('1.234,56')).toBe(1234.56)
  })

  it('parses SBV balance format: 18.815.882,09 → 18815882.09', () => {
    expect(parseVnFloat('18.815.882,09')).toBe(18815882.09)
  })

  it('returns NaN for empty string', () => {
    expect(Number.isNaN(parseVnFloat(''))).toBe(true)
  })

  it('returns NaN for non-numeric string', () => {
    expect(Number.isNaN(parseVnFloat('abc'))).toBe(true)
  })
})

describe('extractNumber', () => {
  it('extracts number from SBV rate text: Lãi suất tái cấp vốn 4,500%', () => {
    expect(extractNumber('Lãi suất tái cấp vốn 4,500%')).toBe(4.5)
  })

  it('extracts first valid number in range 1-15 for policy rate', () => {
    const text = 'Lãi suất 3,5% Lãi suất 6,25% Lãi suất 12,0%'
    expect(extractNumber(text, { min: 1, max: 15 })).toBe(3.5)
  })

  it('returns null when no number found', () => {
    expect(extractNumber('no numbers here')).toBeNull()
  })

  it('returns null when number outside range', () => {
    expect(extractNumber('value: 99.5%', { min: 1, max: 15 })).toBeNull()
  })

  it('extracts realistic USD/VND: TỶ GIÁ 25.085 VND', () => {
    const text = 'TỶ GIÁ 25.085 VND'
    // currencyMode=true: dot is treated as thousand separator → 25085
    expect(extractNumber(text, { min: 20000, max: 30000 }, true)).toBe(25085)
  })

  it('extracts USD/VND without currencyMode (standard parse)', () => {
    // Standard parse would get 25.085 — but that's below min=20000 range
    const text = 'TỶ GIÁ 25.085 VND'
    expect(extractNumber(text, { min: 20, max: 30 })).toBe(25.085)
  })
})

describe('extractRange', () => {
  it('extracts PMI-like value: Vietnam PMI 54.3', () => {
    const result = extractRange('Vietnam Manufacturing PMI 54.3', { min: 35, max: 70 })
    expect(result).toBe(54.3)
  })

  it('extracts Vietnamese float: tăng trưởng tín dụng 12,35%', () => {
    const result = extractRange('tăng trưởng tín dụng 12,35%', { min: 0.5, max: 25 })
    expect(result).toBe(12.35)
  })

  it('returns null for no match', () => {
    const result = extractRange('some text without numbers', { min: 1, max: 100 })
    expect(result).toBeNull()
  })

  it('returns null for out-of-range value', () => {
    const result = extractRange('Vietnam PMI 85.0', { min: 35, max: 70 })
    expect(result).toBeNull()
  })
})

describe('extractCreditGrowth', () => {
  it('extracts credit growth percentage', () => {
    const result = extractCreditGrowth('tăng trưởng tín dụng 12,35%', { min: 0.5, max: 25 })
    expect(result).toBe(12.35)
  })

  it('returns null when no match', () => {
    const result = extractCreditGrowth('GDP tăng 8.5%', { min: 0.5, max: 25 })
    expect(result).toBeNull()
  })
})

describe('extractPMI', () => {
  it('extracts PMI value', () => {
    const result = extractPMI('Vietnam Manufacturing PMI 54.3', { min: 35, max: 70 })
    expect(result).toBe(54.3)
  })

  it('returns null when out of range', () => {
    const result = extractPMI('Vietnam PMI 85.0', { min: 35, max: 70 })
    expect(result).toBeNull()
  })
})
