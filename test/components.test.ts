import type {AssetLookup} from '#src/lib/senders.ts'

import {describe, expect, test} from 'bun:test'

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import {buildMessages} from '#src/lib/blocks.ts'
import {parseSource} from '#src/lib/parse.ts'
import {presets} from '#src/lib/presets.ts'
import {resolveSender} from '#src/lib/senders.ts'

import testSassModulesPlugin from './lib/sassModulesPlugin.js'

Bun.plugin(testSassModulesPlugin)
async function render(componentSegment: string, props?: object) {
  const Component = (await import(`#src/components/${componentSegment}/index.tsx`)).default
  const element = createElement(Component, props)
  return renderToStaticMarkup(element)
}
const noAssets: AssetLookup = () => {}
describe('components', () => {
  test('App', async () => {
    const html = await render('App')
    expect(html.length).toBeGreaterThan(0)
  })
  test('Avatar', async () => {
    const html = await render('Avatar', {
      avatar: {
        src: '/avatars/user.svg',
        background: '#ff5cce',
        shape: 'squircle',
        scale: 75,
        glyph: true,
      },
      name: 'Jaid',
    })
    expect(html).toContain('/avatars/user.svg')
    expect(html).toContain('#ff5cce')
    expect(html).toContain('75%')
  })
  test('Presets', async () => {
    const html = await render('Presets', {onSelect: () => {}})
    for (const preset of presets) {
      expect(html).toContain(preset.title)
    }
  })
  test('Toolbar', async () => {
    const html = await render('Toolbar', {
      onCopy: () => {},
      onDownload: () => {},
      busy: false,
    })
    expect(html).toContain('Copy PNG')
    expect(html).toContain('Download PNG')
  })
  test('ErrorBar', async () => {
    expect(await render('ErrorBar', {error: undefined})).toBe('')
    expect(await render('ErrorBar', {error: 'Broken'})).toContain('Broken')
  })
  test('AssetBar', async () => {
    expect(await render('AssetBar', {
      assets: [],
      onRemove: () => {},
    })).toBe('')
    const html = await render('AssetBar', {
      assets: [
        {
          id: 2,
          name: 'cat.png',
          url: 'blob:cat',
          type: 'image/png',
        },
      ],
      onRemove: () => {},
    })
    expect(html).toContain('blob:cat')
    expect(html).toContain('2')
  })
  test('HighlightedCode falls back to plain text before Shiki resolves', async () => {
    const html = await render('HighlightedCode', {
      code: 'const a = 1',
      language: 'typescript',
    })
    expect(html).toContain('const a = 1')
  })
  test('ContentBlock renders every content kind', async () => {
    const kinds = ['text', 'markdown', 'image', 'code', 'data', 'call', 'diff'] as const
    for (const kind of kinds) {
      const value = kind === 'image' ? '/metaverse.jxl' : kind === 'code' ? {
        text: 'print(1)',
        language: 'python',
      } : kind === 'call' ? {
        tool: 'search',
        input: {query: 'x'},
      } : kind === 'diff' ? {
        before: 'a\n',
        after: 'b\n',
      } : kind === 'data' ? {a: 1} : 'hello'
      const html = await render('ContentBlock', {
        block: {
          kind,
          value,
        },
        style: {
          dataFlavor: 'json5',
          messageWidth: '70ch',
        },
        assets: noAssets,
        onJump: () => {},
      })
      expect(html).toContain(`data-kind="${kind}"`)
    }
  })
  test('Message renders a bubble per side', async () => {
    const input = {chat: []}
    for (const side of ['ours', 'theirs'] as const) {
      const html = await render('Message', {
        message: {
          index: 0,
          from: side === 'ours' ? 'user' : 'assistant',
          blocks: [
            {
              kind: 'text',
              value: 'Hello',
            },
          ],
        },
        sender: resolveSender(side === 'ours' ? 'user' : 'assistant', input, noAssets),
        rootStyle: undefined,
        showAvatar: true,
        showName: true,
        joinsPrevious: false,
        joinsNext: false,
        assets: noAssets,
        onJump: () => {},
      })
      expect(html).toContain(`data-side="${side}"`)
      expect(html).toContain('Hello')
    }
  })
  test('Chat marks adjacent messages from the same sender as joined', async () => {
    const result = parseSource('chat:\n  - from: assistant\n    text: one\n  - from: assistant\n    text: two\n  - from: user\n    text: three\n')
    const messages = buildMessages(result.input!.chat, result.document)
    const html = await render('Chat', {
      input: result.input,
      messages,
      assets: noAssets,
      onHover: () => {},
      onJump: () => {},
    })
    expect(html).toContain('data-joins-next="true"')
    expect(html).toContain('data-joins-previous="true"')
    expect(html.match(/<img[^>]+src="\/avatars\/assistant\.svg"/gu)?.length).toBe(1)
  })
  test('Chat renders one message per chat entry', async () => {
    const result = parseSource('chat:\n  - from: user\n    text: one\n  - from: assistant\n    text: two\n')
    const messages = buildMessages(result.input!.chat, result.document)
    const html = await render('Chat', {
      input: result.input,
      messages,
      assets: noAssets,
      onJump: () => {},
    })
    expect(html).toContain('one')
    expect(html).toContain('two')
  })
  test('Mockup renders presets while the editor is empty', async () => {
    const html = await render('Mockup', {
      messages: [],
      assets: noAssets,
      empty: true,
      onJump: () => {},
      onSelectPreset: () => {},
    })
    expect(html).toContain('Painting analysis')
  })
  test('Mockup renders the chat when input is present', async () => {
    const result = parseSource('chat:\n  - from: user\n    text: Hello\n')
    const messages = buildMessages(result.input!.chat, result.document)
    const html = await render('Mockup', {
      input: result.input,
      messages,
      assets: noAssets,
      empty: false,
      onJump: () => {},
      onSelectPreset: () => {},
    })
    expect(html).toContain('Hello')
    expect(html).toContain('Copy PNG')
  })
  test('PlainTextEditor preserves editing when Monaco is unavailable', async () => {
    const html = await render('PlainTextEditor', {
      value: 'chat: []',
      issues: [{message: 'example'}],
      onChange: () => {},
      onReady: () => {},
    })
    expect(html).toContain('Monaco could not load')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('chat: []')
  })
  test('content blocks expose keyboard-accessible source jumps', async () => {
    const html = await render('ContentBlock', {
      block: {
        kind: 'text',
        value: 'jump',
      },
      style: {
        dataFlavor: 'json5',
        messageWidth: '70ch',
      },
      assets: noAssets,
      onJump: () => {},
    })
    expect(html).toContain('role="button"')
    expect(html).toContain('tabindex="0"')
  })
  test('hidden messages do not render', async () => {
    const result = parseSource('chat:\n  - from: user\n    text: visible\n  - from: assistant\n    style:\n      visible: false\n    text: secret\n')
    const messages = buildMessages(result.input!.chat, result.document)
    const html = await render('Chat', {
      input: result.input,
      messages,
      assets: noAssets,
      onJump: () => {},
    })
    expect(html).toContain('visible')
    expect(html).not.toContain('secret')
  })
  test('light sender backgrounds receive dark bubble text', async () => {
    const html = await render('Message', {
      message: {
        index: 0,
        from: 'assistant',
        blocks: [
          {
            kind: 'text',
            value: 'Readable',
          },
        ],
      },
      sender: {
        id: 'assistant',
        name: 'Assistant',
        side: 'theirs',
        background: 'MintCream',
        avatar: {
          src: '/avatars/assistant.svg',
          background: 'MintCream',
          shape: 'circle',
          scale: 90,
          glyph: true,
        },
      },
      rootStyle: undefined,
      showName: true,
      joinsPrevious: false,
      joinsNext: false,
      assets: noAssets,
      onJump: () => {},
    })
    expect(html).toContain('color:#000000')
  })
})
