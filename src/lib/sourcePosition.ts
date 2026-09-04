import type {Range} from 'yaml'

export type SourcePosition = {
  column: number
  lineNumber: number
}

/** Converts a character offset into a 1-based Monaco position. */
export const offsetToPosition = (source: string, offset: number): SourcePosition => {
  const limit = Math.max(0, Math.min(offset, source.length))
  let lineNumber = 1
  let lastNewline = -1
  for (let index = 0; index < limit; index++) {
    if (source[index] === '\n') {
      lineNumber++
      lastNewline = index
    }
  }
  return {
    lineNumber,
    column: limit - lastNewline,
  }
}

export const rangeToPosition = (source: string, range: Range | undefined): SourcePosition => {
  return offsetToPosition(source, range?.[0] ?? 0)
}
