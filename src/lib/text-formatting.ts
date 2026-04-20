export interface TextPart {
  text: string
  bold?: boolean
}

export function parseBoldFormatting(text: string): TextPart[] {
  if (typeof text !== 'string' || text.length === 0) {
    return [{ text: '' }]
  }

  const parts: TextPart[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) })
    }
    parts.push({ text: match[1], bold: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) })
  }

  return parts
}
