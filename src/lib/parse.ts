import type {ParsedInput} from './schema.ts'
import type {Range} from 'yaml'

import JSON5 from 'json5'
import {isMap, isNode, isPair, isScalar, parseDocument} from 'yaml'
import zod from 'zod'

import {inputSchema} from './schema.ts'

export type SourceDocument = ReturnType<typeof parseDocument>

export type SourceIssue = {
  message: string
  /** Character offsets in the source, used to place editor markers. */
  range?: Range
}

export type ParseResult = {
  /** The parsed YAML document, used to map values back to source offsets. */
  document?: SourceDocument
  error?: string
  /** The validated input, absent while the source is empty or invalid. */
  input?: ParsedInput
  issues?: Array<SourceIssue>
  source: string
}

const getMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
const describeYamlError = (error: {linePos?: Array<{col: number
  line: number}>
message: string}) => {
  const position = error.linePos?.[0]
  return position ? `${error.message} (line ${position.line}, column ${position.col})` : error.message
}
const issueLabel = (path: Array<PropertyKey>) => {
  if (path.length) {
    return path.map(String).join('.')
  }
  return 'root'
}
const getNodeRange = (node: unknown) => {
  if (isNode(node)) {
    return node.range ?? undefined
  }
}
const getUnknownKeyRange = (document: SourceDocument, path: Array<PropertyKey>, key: string) => {
  const yamlPath = path.filter((part): part is number | string => typeof part === 'string' || typeof part === 'number')
  const parent: unknown = document.getIn(yamlPath, true)
  if (!isMap(parent)) {
    return
  }
  const pair = (parent.items as Array<unknown>).find(item => {
    return isPair(item) && isScalar(item.key) && String(item.key.value) === key
  })
  if (!isPair(pair)) {
    return
  }
  return getNodeRange(pair.key) ?? getNodeRange(pair.value)
}
const getZodIssues = (error: zod.ZodError, document?: SourceDocument): Array<SourceIssue> => {
  return error.issues.flatMap(issue => {
    const path = [...issue.path]
    if (document && issue.code === 'unrecognized_keys' && Array.isArray(issue.keys)) {
      return issue.keys.map(key => ({
        message: `${issueLabel([...path, key])}: unrecognized key`,
        range: getUnknownKeyRange(document, path, key),
      }))
    }
    const yamlPath = path.filter((part): part is number | string => typeof part === 'string' || typeof part === 'number')
    const node: unknown = document?.getIn(yamlPath, true)
    return [
      {
        message: `${issueLabel(path)}: ${issue.message}`,
        range: getNodeRange(node),
      },
    ]
  })
}

/** Parses YAML/JSON5 and validates it against the public display.chat schema. */
export const parseSource = (source: string): ParseResult => {
  if (!source.trim()) {
    return {source}
  }
  const trimmed = source.trimStart()
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[')
  const attempts = looksLikeJson ? ['json5', 'yaml'] : ['yaml', 'json5']
  let syntaxError: string | undefined
  let syntaxIssues: Array<SourceIssue> | undefined
  for (const attempt of attempts) {
    if (attempt === 'yaml') {
      const document = parseDocument(source, {
        prettyErrors: true,
        uniqueKeys: true,
      })
      if (document.errors.length) {
        syntaxError ??= document.errors.map(describeYamlError).join('\n')
        syntaxIssues ??= document.errors.map(error => ({
          message: error.message,
          range: [error.pos[0], error.pos[1], error.pos[1]] as Range,
        }))
        continue
      }
      const result = inputSchema.safeParse(document.toJS())
      if (result.success) {
        return {
          source,
          input: result.data,
          document,
        }
      }
      return {
        source,
        document,
        error: zod.prettifyError(result.error),
        issues: getZodIssues(result.error, document),
      }
    }
    let value: unknown
    try {
      value = JSON5.parse(source)
    } catch (error) {
      syntaxError ??= getMessage(error)
      syntaxIssues ??= [{message: getMessage(error)}]
      continue
    }
    const result = inputSchema.safeParse(value)
    if (result.success) {
      return {
        source,
        input: result.data,
      }
    }
    return {
      source,
      error: zod.prettifyError(result.error),
      issues: getZodIssues(result.error),
    }
  }
  return {
    source,
    error: syntaxError ?? 'The source could not be parsed',
    issues: syntaxIssues,
  }
}
