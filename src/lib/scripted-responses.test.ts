import { needsAI } from './scripted-responses'

describe('market intent AI routing', () => {
  const cases: Array<[string, string]> = [
    ['ask_gold', 'vàng'],
    ['ask_stock', 'chứng khoán'],
    ['ask_crypto', 'bitcoin'],
    ['compare_gold_stock', 'vàng vs chứng khoán'],
    ['ask_inflation', 'lạm phát'],
    ['ask_realestate', 'mua nhà'],
  ]

  it.each(cases)('returns true for %s when asked with %s', (intent, text) => {
    expect(needsAI(intent as any, text)).toBe(true)
  })
})
