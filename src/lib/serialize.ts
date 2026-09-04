import type {Input} from './schema.ts'

import {stringify} from 'yaml'

/**
 * Serializes an input object to the YAML shown in the editor.
 * Line folding is disabled so that long message texts stay on a single logical line.
 */
export const serializeInput = (input: Input) => {
  return stringify(input, {
    indent: 2,
    lineWidth: 0,
    singleQuote: false,
  })
}
