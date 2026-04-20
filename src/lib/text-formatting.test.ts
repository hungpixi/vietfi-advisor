import { parseBoldFormatting } from './text-formatting'

describe('parseBoldFormatting', () => {
  it('parses bold spans wrapped in ** correctly', () => {
    const result = parseBoldFormatting('Hello **world**! This is **bold** text.')
    expect(result).toEqual([
      { text: 'Hello ' },
      { text: 'world', bold: true },
      { text: '! This is ' },
      { text: 'bold', bold: true },
      { text: ' text.' },
    ])
  })

  it('returns plain text when no bold delimiters are present', () => {
    const result = parseBoldFormatting('No bold here')
    expect(result).toEqual([{ text: 'No bold here' }])
  })
})
