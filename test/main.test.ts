import type {AssetLookup} from '#src/lib/senders.ts'

import {describe, expect, test} from 'bun:test'

import {getNextAssetId, isConfigurationFile, isImageFile, readConfigurationFile} from '#src/lib/assets.ts'
import {buildMessages} from '#src/lib/blocks.ts'
import {diffLines, formatDiff} from '#src/lib/diff.ts'
import {highlightCode} from '#src/lib/highlight.ts'
import {parseSource} from '#src/lib/parse.ts'
import {presets} from '#src/lib/presets.ts'
import {inputSchema} from '#src/lib/schema.ts'
import {resolveSender} from '#src/lib/senders.ts'
import {serializeInput} from '#src/lib/serialize.ts'
import {offsetToPosition} from '#src/lib/sourcePosition.ts'
import {resolveStyle} from '#src/lib/style.ts'

describe('parseSource', () => {
  test('parses YAML', () => {
    const result = parseSource('chat:\n  - from: user\n    text: Hello\n')
    expect(result.error).toBeUndefined()
    expect(result.input?.chat).toHaveLength(1)
    expect(result.document).toBeDefined()
  })
  test('parses JSON5 with trailing commas', () => {
    const result = parseSource('{"chat":[{"from":"user","text":"Hello",}]}')
    expect(result.error).toBeUndefined()
    expect(result.input?.chat[0].from).toBe('user')
  })
  test('reports schema issues with source ranges', () => {
    const result = parseSource('chat:\n  - from: user\n    bogus: 1\n')
    expect(result.input).toBeUndefined()
    expect(result.error).toContain('Unrecognized key')
    expect(result.issues?.[0].range?.[0]).toBeGreaterThan(0)
  })
  test('reports YAML syntax errors with source ranges', () => {
    const result = parseSource('chat: [')
    expect(result.input).toBeUndefined()
    expect(result.error).toBeDefined()
    expect(result.issues?.[0].range).toBeDefined()
  })
  test('treats empty source as empty rather than invalid', () => {
    const result = parseSource('   \n  ')
    expect(result.error).toBeUndefined()
    expect(result.input).toBeUndefined()
  })
})
describe('serializeInput', () => {
  test('round-trips through parseSource', () => {
    const input = {
      chat: [
        {
          from: 'user',
          text: 'Hello',
        },
        {
          from: 'assistant',
          blocks: [{data: {answer: 42}}],
        },
      ],
    }
    const source = serializeInput(input)
    const result = parseSource(source)
    expect(result.error).toBeUndefined()
    expect(result.input?.chat).toHaveLength(2)
    expect(result.input?.chat[1].blocks?.[0]).toEqual({data: {answer: 42}})
  })
})
describe('buildMessages', () => {
  const source = [
    'chat:',
    '  - from: user',
    '    text: first',
    '    markdown: second',
    '    blocks:',
    '      - text: third',
    '      - data:',
    '          a: 1',
  ].join('\n')
  test('keeps shortcut order and appends blocks', () => {
    const result = parseSource(source)
    expect(result.error).toBeUndefined()
    const messages = buildMessages(result.input!.chat, result.document)
    expect(messages).toHaveLength(1)
    expect(messages[0].blocks.map(block => block.kind)).toEqual(['text', 'markdown', 'text', 'data'])
  })
  test('exposes ranges for blocks but not for shortcuts', () => {
    const result = parseSource(source)
    const messages = buildMessages(result.input!.chat, result.document)
    expect(messages[0].blocks[0].range).toBeUndefined()
    expect(messages[0].blocks[2].range).toBeDefined()
    expect(messages[0].range).toBeDefined()
  })
  test('resolves the block range to the matching source line', () => {
    const result = parseSource(source)
    const messages = buildMessages(result.input!.chat, result.document)
    const range = messages[0].blocks[2].range!
    const position = offsetToPosition(source, range[0])
    expect(position.lineNumber).toBe(6)
  })
})
describe('resolveSender', () => {
  const lookup: AssetLookup = () => {}
  test('uses built-in defaults', () => {
    const input = {chat: []}
    expect(resolveSender('user', input, lookup)).toMatchObject({
      name: 'User',
      side: 'ours',
      background: '#ff5cce',
    })
    expect(resolveSender('assistant', input, lookup)).toMatchObject({
      name: 'Assistant',
      side: 'theirs',
      background: '#3b9cf6',
      avatar: {scale: 75},
    })
  })
  test('derives the display name from the sender ID', () => {
    const sender = resolveSender('releaseBot', {chat: []}, lookup)
    expect(sender.name).toBe('Release Bot')
    expect(sender.side).toBe('theirs')
    expect(sender.avatar.src).toBe('/avatars/assistant.svg')
  })
  test('uses the user avatar for custom senders on our side', () => {
    const sender = resolveSender('me', {
      chat: [],
      senders: {me: {side: 'ours'}},
    }, lookup)
    expect(sender.side).toBe('ours')
    expect(sender.avatar.src).toBe('/avatars/user.svg')
    expect(sender.avatar.scale).toBe(90)
    expect(sender.background).toBe('#ff5cce')
  })
  test('uses the padded system glyph by default', () => {
    const sender = resolveSender('system', {chat: []}, () => undefined)
    expect(sender.avatar.scale).toBe(70)
  })
  test('uses the padded assistant glyph for custom senders on their side', () => {
    const sender = resolveSender('reviewBot', {chat: []}, lookup)
    expect(sender.avatar.src).toBe('/avatars/assistant.svg')
    expect(sender.avatar.scale).toBe(75)
  })
  test('resolves imported image IDs', () => {
    const sender = resolveSender('user', {
      chat: [],
      user: {avatar: 3},
    }, id => `/blob/${id}`)
    expect(sender.avatar.src).toBe('/blob/3')
    expect(sender.avatar.glyph).toBe(false)
  })
  test('defaults explicitly supplied avatars to full scale', () => {
    const sourceOnly = resolveSender('user', {
      chat: [],
      user: {avatar: '/jaid.jxl'},
    }, lookup)
    expect(sourceOnly.avatar.src).toBe('/jaid.jxl')
    expect(sourceOnly.avatar.scale).toBe(100)
    expect(sourceOnly.background).toBe('#ff5cce')

    const detailed = inputSchema.parse({
      chat: [],
      user: {
        avatar: {src: '/jaid.jxl'},
      },
    })
    expect(detailed.user.avatar).toMatchObject({
      src: '/jaid.jxl',
      scale: 100,
    })
  })
})
describe('resolveStyle', () => {
  test('fills defaults and lets messages override them', () => {
    const style = resolveStyle({dataFlavor: 'yaml'}, {messageWidth: 320})
    expect(style.dataFlavor).toBe('yaml')
    expect(style.messageWidth).toBe(320)
  })
  test('inherits and overrides syntax themes', () => {
    expect(resolveStyle({syntaxTheme: 'vesper'}).syntaxTheme).toBe('vesper')
    expect(resolveStyle({syntaxTheme: 'vesper'}, {syntaxTheme: 'nord'}).syntaxTheme).toBe('nord')
  })
  test('message style only overrides explicitly specified root properties', () => {
    const result = parseSource('style:\n  dataFlavor: yaml\n  messageWidth: 50ch\nchat:\n  - from: assistant\n    style:\n      syntaxTheme: nord\n    data:\n      hello: world\n')
    expect(result.error).toBeUndefined()
    expect(result.input?.chat[0].style).toEqual({
      syntaxTheme: 'nord',
      visible: true,
    })
    expect(resolveStyle(result.input?.style, result.input?.chat[0].style)).toMatchObject({
      dataFlavor: 'yaml',
      messageWidth: '50ch',
      syntaxTheme: 'nord',
    })
  })
  test('falls back to JSON5', () => {
    expect(resolveStyle().dataFlavor).toBe('json5')
  })
})
describe('diffLines', () => {
  test('produces a unified diff', () => {
    const lines = diffLines('a\nb\nc\n', 'a\nx\nc\n')
    expect(formatDiff(lines)).toBe(' a\n-b\n+x\n c')
  })
  test('handles insertions and deletions', () => {
    expect(formatDiff(diffLines('a\n', 'a\nb\n'))).toBe(' a\n+b')
    expect(formatDiff(diffLines('a\nb\n', 'a\n'))).toBe(' a\n-b')
  })
})
describe('getNextAssetId', () => {
  test('fills gaps', () => {
    expect(getNextAssetId([
      {
        id: 0,
        name: '',
        url: '',
        type: '',
      }, {
        id: 2,
        name: '',
        url: '',
        type: '',
      },
    ])).toBe(1)
  })
  test('starts at zero', () => {
    expect(getNextAssetId([])).toBe(0)
  })
})
describe('offsetToPosition', () => {
  test('counts lines and columns', () => {
    expect(offsetToPosition('a\nbc\nd', 0)).toEqual({
      lineNumber: 1,
      column: 1,
    })
    expect(offsetToPosition('a\nbc\nd', 2)).toEqual({
      lineNumber: 2,
      column: 1,
    })
    expect(offsetToPosition('a\nbc\nd', 4)).toEqual({
      lineNumber: 2,
      column: 3,
    })
    expect(offsetToPosition('a\nbc\nd', 5)).toEqual({
      lineNumber: 3,
      column: 1,
    })
  })
})
describe('definitive contract coverage', () => {
  test('accepts bundled Shiki syntax themes and rejects unknown ones', () => {
    const valid = parseSource('style:\n  syntaxTheme: vesper\nchat: []\n')
    expect(valid.error).toBeUndefined()
    expect(valid.input?.style?.syntaxTheme).toBe('vesper')
    const invalid = parseSource('style:\n  syntaxTheme: definitely-not-a-theme\nchat: []\n')
    expect(invalid.error).toContain('Invalid option')
  })
  test('renders a selected bundled syntax theme', async () => {
    const defaultHtml = await highlightCode('const answer = 42', 'typescript')
    const themedHtml = await highlightCode('const answer = 42', 'typescript', 'vesper')
    expect(themedHtml).toContain('vesper')
    expect(themedHtml).not.toBe(defaultHtml)
  })
  test('allows empty messages', () => {
    const result = parseSource('chat:\n  - from: user\n')
    expect(result.error).toBeUndefined()
    expect(result.input?.chat).toHaveLength(1)
  })
  test('keeps built-in defaults internally consistent', () => {
    const input = inputSchema.parse({chat: []})
    expect(input.system.avatar).toMatchObject({
      src: 'system',
      background: '#b83b15',
    })
    expect(input.user.avatar).toMatchObject({
      src: 'user',
      background: '#ff5cce',
    })
    expect(input.assistant.avatar).toMatchObject({
      src: 'assistant',
      background: '#3b9cf6',
    })
    expect(input.tool.avatar).toMatchObject({
      src: 'tool',
      background: '#2e7c38',
    })
  })
  test('every bundled preset round-trips through YAML validation', () => {
    for (const preset of presets) {
      const result = parseSource(serializeInput(preset.input))
      expect(result.error).toBeUndefined()
      expect(result.input?.chat.length).toBeGreaterThan(0)
    }
  })
  test('points unrecognized-key diagnostics at the actual key', () => {
    const source = 'chat:\n  - from: user\n    surprise: true\n'
    const result = parseSource(source)
    const issue = result.issues?.find(candidate => candidate.message.includes('surprise'))
    expect(issue?.range).toBeDefined()
    expect(offsetToPosition(source, issue!.range![0])).toEqual({
      lineNumber: 3,
      column: 5,
    })
  })
})
describe('file import helpers', () => {
  test('recognizes image extensions even without a MIME type', () => {
    expect(isImageFile(new File(['x'], 'painting.jxl'))).toBe(true)
    expect(isImageFile(new File(['x'], 'photo.webp'))).toBe(true)
    expect(isImageFile(new File(['x'], 'chat.yaml'))).toBe(false)
  })
  test('only configuration formats replace the editor', () => {
    expect(isConfigurationFile(new File([''], 'chat.yaml'))).toBe(true)
    expect(isConfigurationFile(new File([''], 'chat.json5'))).toBe(true)
    expect(isConfigurationFile(new File([''], 'notes.md'))).toBe(false)
  })
  test('normalizes JSON5 imports to YAML', async () => {
    const file = new File(['{chat: [{from: "user", text: "hello"}],}'], 'chat.json5')
    const source = await readConfigurationFile(file)
    expect(source).toContain('chat:')
    expect(source).not.toContain('{chat:')
    const result = parseSource(source)
    expect(result.input?.chat[0].text).toBe('hello')
    expect(result.document).toBeDefined()
  })
})
