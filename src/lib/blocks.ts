import type {SourceDocument} from './parse.ts'
import type {Block, CallContent, CodeContent, DiffContent, ImageContent, Message, MessageStyle} from './schema.ts'
import type {Range} from 'yaml'

import {isMap, isNode, isScalar, isSeq} from 'yaml'

export const contentKinds = ['text', 'markdown', 'image', 'code', 'data', 'call', 'diff'] as const

export type ContentKind = typeof contentKinds[number]

export type ContentBlock = {
  [Kind in ContentKind]: ContentBlockFor<Kind>
}[ContentKind]

export type RenderMessage = {
  blocks: Array<ContentBlock>
  from: string
  index: number
  /** Source range of the whole chat message. */
  range?: Range
  style?: MessageStyle
}

type ContentValueMap = {
  call: CallContent
  code: CodeContent
  data: unknown
  diff: DiffContent
  image: ImageContent
  markdown: string
  text: string
}

type ContentBlockFor<Kind extends ContentKind> = {
  /** Optional file name shown above code, image and diff blocks. */
  file?: string
  kind: Kind
  /** Explicit block range. Shortcut properties intentionally fall back to the message range. */
  range?: Range
  value: ContentValueMap[Kind]
}

const isContentKind = (value: unknown): value is ContentKind => {
  return typeof value === 'string' && (contentKinds as ReadonlyArray<string>).includes(value)
}
const createShortcutBlock = (message: Message, kind: ContentKind): ContentBlock | undefined => {
  switch (kind) {
    case 'text': { return message.text === undefined ? undefined : {
      kind,
      value: message.text,
    } }
    case 'markdown': { return message.markdown === undefined ? undefined : {
      kind,
      value: message.markdown,
    } }
    case 'image': { return message.image === undefined ? undefined : {
      kind,
      value: message.image,
    } }
    case 'code': { return message.code === undefined ? undefined : {
      kind,
      value: message.code,
    } }
    case 'data': { return message.data === undefined ? undefined : {
      kind,
      value: message.data,
    } }
    case 'call': { return message.call === undefined ? undefined : {
      kind,
      value: message.call,
    } }
    case 'diff': { return message.diff === undefined ? undefined : {
      kind,
      value: message.diff,
    } }
  }
}
const createExplicitBlock = (block: Block, range?: Range): ContentBlock => {
  if ('text' in block) {
    return {
      kind: 'text',
      value: block.text,
      range,
    }
  }
  if ('markdown' in block) {
    return {
      kind: 'markdown',
      value: block.markdown,
      range,
    }
  }
  if ('image' in block) {
    return {
      kind: 'image',
      value: block.image,
      file: block.file,
      range,
    }
  }
  if ('code' in block) {
    return {
      kind: 'code',
      value: block.code,
      file: block.file,
      range,
    }
  }
  if ('data' in block) {
    return {
      kind: 'data',
      value: block.data,
      range,
    }
  }
  if ('call' in block) {
    return {
      kind: 'call',
      value: block.call,
      range,
    }
  }
  return {
    kind: 'diff',
    value: block.diff,
    range,
  }
}
const getNodeRange = (node: unknown) => {
  if (isNode(node)) {
    return node.range ?? undefined
  }
}

/**
 * Flattens validated chat messages, preserving YAML source order for shortcut properties and
 * resolving exact source ranges for entries in the explicit `blocks` array.
 */
export const buildMessages = (chat: Array<Message>, document?: SourceDocument): Array<RenderMessage> => {
  return chat.map((message, index) => {
    const messageNode: unknown = document?.getIn(['chat', index], true)
    const blocks: Array<ContentBlock> = []
    if (isMap(messageNode)) {
      for (const pair of messageNode.items) {
        const key = isScalar(pair.key) ? pair.key.value : undefined
        if (!isContentKind(key)) {
          continue
        }
        const block = createShortcutBlock(message, key)
        if (block) {
          blocks.push(block)
        }
      }
    } else {
      for (const kind of contentKinds) {
        const block = createShortcutBlock(message, kind)
        if (block) {
          blocks.push(block)
        }
      }
    }
    const blocksNode: unknown = document?.getIn(['chat', index, 'blocks'], true)
    for (const [blockIndex, block] of (message.blocks ?? []).entries()) {
      const blockNode: unknown = isSeq(blocksNode) ? blocksNode.get(blockIndex, true) : undefined
      blocks.push(createExplicitBlock(block, getNodeRange(blockNode)))
    }
    return {
      index,
      from: message.from,
      style: message.style,
      blocks,
      range: getNodeRange(messageNode),
    }
  })
}
