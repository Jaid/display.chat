import type {JSONSchema} from 'monaco-yaml'

import zod from 'zod'

import {inputSchema} from './schema.ts'

/** JSON Schema representation of the editable source shape, used by Monaco YAML IntelliSense. */
export const inputJsonSchema = zod.toJSONSchema(inputSchema, {
  io: 'input',
  target: 'draft-7',
}) as JSONSchema
