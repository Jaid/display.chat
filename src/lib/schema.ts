import {themeNames} from '@shikijs/themes'

import {builtinSenderIds, getBuiltinSenderInputDefault, senderSides} from './builtinSenders.ts'
import type {BuiltinSenderId} from './builtinSenders.ts'
import flattenString from 'flatten-string'
import zod from 'zod'

export {builtinSenderIds} from './builtinSenders.ts'
const nonEmptyString = zod.string().nonempty()
export const roleIdSchema = zod.enum(builtinSenderIds).describe('built-in sender role ID')
export const messageFromSchema = nonEmptyString.describe('a built-in sender ID or a key from the root senders object')
export const urlSchema = zod.union([zod.url(), zod.string().regex(/^(?:\.{1,2}\/|\/)/u)]).describe('absolute URL or site/file-relative URL path')
export const avatarSrcSchema = zod.union([urlSchema, zod.int().nonnegative(), roleIdSchema]).describe('avatar source: a URL, an integer ID referencing an imported picture, or a built-in sender role ID')
export const sideSchema = zod.enum(senderSides).describe('which edge messages from this sender align to')
export const syntaxThemeSchema = zod.enum(themeNames).describe('bundled Shiki theme used for syntax highlighting')
export const avatarShapeSchema = zod.union([
  zod.enum(['circle', 'square', 'squircle', 'rounded']), zod.strictObject({
    shape: zod.enum(['squircle', 'rounded']).default('squircle'),
    radius: zod.number().min(0).describe('custom avatar corner radius in pixels'),
  }),
]).describe('preset avatar shape or a custom pixel radius')
export const avatarSchema = zod.union([
  avatarSrcSchema, zod.strictObject({
    src: avatarSrcSchema.describe('avatar source: a URL, an integer ID referencing an imported picture, or a built-in sender role ID'),
    background: nonEmptyString.optional().describe('background value as CSS displayed behind the avatar image'),
    shape: avatarShapeSchema.optional(),
    scale: zod.number().min(0).max(300).default(100).describe(flattenString.paragraphs('foreground content scale inside the avatar background shape, as a percentage', 'Values above 100 may outgrow the background shape; overflow is clipped.')),
  }),
]).describe('an avatar source or detailed avatar definition')
const senderFields = {
  name: nonEmptyString.optional().describe(flattenString.paragraphs('optional display name', 'When omitted, derive it from the sender ID with `startCase` from `es-toolkit/string`.')),
  avatar: avatarSchema.optional(),
}
const createSenderSchema = (defaultSide: zod.infer<typeof sideSchema>) => zod.strictObject({
  ...senderFields,
  side: sideSchema.default(defaultSide),
}).describe('optional customization for a chat sender')
const createBuiltinSenderField = (id: BuiltinSenderId) => {
  const defaults = getBuiltinSenderInputDefault(id)
  return zod.strictObject({
    ...senderFields,
    avatar: avatarSchema.default(defaults.avatar),
    side: sideSchema.default(defaults.side),
  }).describe('optional customization for a built-in chat sender').default(defaults)
}
export const senderSchema = createSenderSchema('theirs')
export const codeContentSchema = zod.union([
  zod.string(), zod.strictObject({
    text: zod.string(),
    language: nonEmptyString.optional(),
  }),
]).describe('code content as plain source text or source text with an optional syntax-highlighting language')
export const callContentSchema = zod.strictObject({
  tool: nonEmptyString,
  input: zod.record(zod.string(), zod.unknown()).optional(),
}).describe('tool call content')
export const imageContentSchema = zod.union([nonEmptyString, zod.int().nonnegative()]).describe('image URL or imported image ID')
export const diffContentSchema = zod.union([
  zod.strictObject({
    file: nonEmptyString.optional(),
    before: zod.string(),
    after: zod.string(),
  }), zod.strictObject({
    file: nonEmptyString.optional(),
    diff: zod.string(),
  }),
]).describe('diff content as before/after text or a preformatted diff')
export const blockSchema = zod.union([
  zod.strictObject({text: zod.string()}), zod.strictObject({markdown: zod.string()}), zod.strictObject({
    image: imageContentSchema,
    file: nonEmptyString.optional(),
  }), zod.strictObject({
    code: codeContentSchema,
    file: nonEmptyString.optional(),
  }), zod.strictObject({data: zod.unknown()}), zod.strictObject({call: callContentSchema}), zod.strictObject({diff: diffContentSchema}),
]).describe('one message content block; each block contains exactly one content kind')
export type Block = zod.infer<typeof blockSchema>
export const fontSchema = zod.union([
  nonEmptyString, zod.strictObject({
    family: nonEmptyString.optional(),
    weight: nonEmptyString.optional(),
    variables: zod.record(zod.string(), zod.number()).optional().describe('variable font axis values keyed by axis name or tag'),
  }).refine(font => font.family !== undefined || font.weight !== undefined, 'Specify at least a font family or weight.'),
]).describe('font family shorthand or detailed font configuration')
export const styleSchema = zod.strictObject({
  dataFlavor: zod.enum(['json', 'json5', 'yaml']).default('json5').describe('serialization format used to render data message content'),
  font: fontSchema.optional(),
  monoFont: fontSchema.optional(),
  syntaxTheme: syntaxThemeSchema.optional(),
  messageWidth: zod.union([zod.number().min(0), nonEmptyString]).default('70ch').describe(flattenString.paragraphs('maximum message width', 'Numbers are interpreted as pixels', 'Strings are CSS width values.')),
}).describe('rendering options for the chat mockup')
export const messageStyleSchema = styleSchema.extend({
  background: nonEmptyString.optional().describe('background value as CSS overriding the message bubble background'),
  visible: zod.boolean().default(true).describe('whether this message is rendered'),
}).describe('rendering options for an individual chat message')
export const messageSchema = zod.strictObject({
  from: messageFromSchema,
  style: messageStyleSchema.optional(),
  text: zod.string().optional(),
  markdown: zod.string().optional(),
  image: imageContentSchema.optional(),
  code: codeContentSchema.optional(),
  data: zod.unknown().optional(),
  call: callContentSchema.optional(),
  diff: diffContentSchema.optional(),
  blocks: zod.array(blockSchema).nonempty().optional().describe(flattenString.paragraphs('ordered message contents appended after direct content-property shortcuts', 'Use blocks when strict ordering or repeated content kinds are needed.')),
}).describe('a chat message using direct content-property shortcuts, an ordered blocks array, or both')
export type Message = zod.infer<typeof messageSchema>
export const chatSchema = zod.array(messageSchema).describe('messages rendered in array order')
export type Chat = zod.infer<typeof chatSchema>
export type Style = zod.output<typeof styleSchema>
export type MessageStyle = zod.output<typeof messageStyleSchema>
export type Font = zod.output<typeof fontSchema>
export type SyntaxTheme = zod.output<typeof syntaxThemeSchema>
export type Avatar = zod.output<typeof avatarSchema>
export type Sender = zod.output<typeof senderSchema>
export type CodeContent = zod.output<typeof codeContentSchema>
export type CallContent = zod.output<typeof callContentSchema>
export type DiffContent = zod.output<typeof diffContentSchema>
export type ImageContent = zod.output<typeof imageContentSchema>
const customSenderIdSchema = nonEmptyString.refine(id => !builtinSenderIds.includes(id as typeof builtinSenderIds[number]), 'Built-in senders must be overridden at the root level.')
export const inputSchema = zod.strictObject({
  background: nonEmptyString.default('black').describe('background value as CSS for the chat mockup'),
  color: nonEmptyString.default('white').describe('text color as CSS for the chat mockup'),
  system: createBuiltinSenderField('system'),
  user: createBuiltinSenderField('user'),
  assistant: createBuiltinSenderField('assistant'),
  tool: createBuiltinSenderField('tool'),
  senders: zod.record(customSenderIdSchema, senderSchema).optional().describe(flattenString.paragraphs('additional named chat senders', 'Keys are sender IDs referenced by `chat[].from`.')),
  chat: chatSchema,
  style: styleSchema.optional(),
}).describe('structured input for rendering a chat conversation').meta({title: 'Chat Mockup Data'})
export type Input = zod.input<typeof inputSchema>
export type ParsedInput = zod.output<typeof inputSchema>

/** A validated input with every default applied, used while the source is invalid. */
export const emptyInput: ParsedInput = inputSchema.parse({chat: []})
