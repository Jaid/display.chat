import {diffLines as diffTextLines} from 'diff'

export type DiffLineType = 'add' | 'context' | 'remove'

export type DiffLine = {text: string
  type: DiffLineType}

const linesFromChange = (value: string) => {
  const lines = value.replaceAll(/\r\n?/gu, '\n').split('\n')
  if (lines.at(-1) === '') {
    lines.pop()
  }
  return lines
}
const getType = (change: {added?: boolean
  removed?: boolean}): DiffLineType => {
  if (change.added) {
    return 'add'
  }
  if (change.removed) {
    return 'remove'
  }
  return 'context'
}

/** Uses the battle-tested `diff` package instead of maintaining a quadratic LCS implementation. */
export const diffLines = (before: string, after: string): Array<DiffLine> => {
  return diffTextLines(before, after).flatMap(change => {
    const type = getType(change)
    return linesFromChange(change.value).map(text => ({
      type,
      text,
    }))
  })
}

const prefixes: Record<DiffLineType, string> = {
  add: '+',
  context: ' ',
  remove: '-',
}

export const formatDiff = (lines: Array<DiffLine>) => lines.map(line => prefixes[line.type] + line.text).join('\n')
