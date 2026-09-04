import type {Input} from './schema.ts'

import initialState from '../initialState.ts'

export type Preset = {
  description: string
  id: string
  input: Input
  title: string
}

const paintingAnalysis: Preset = {
  id: 'painting',
  title: 'Painting analysis',
  description: 'System prompt, image attachment and a JSON result',
  input: initialState,
}
const toolCall: Preset = {
  id: 'tool-call',
  title: 'Tool call',
  description: 'Assistant tool call followed by the tool result',
  input: {
    user: {name: 'Jaid'},
    assistant: {
      name: 'Gemini 3.8 Flash',
      avatar: {
        src: 'assistant',
        background: '#3b9cf6',
        scale: 75,
      },
    },
    tool: {name: 'weather'},
    chat: [
      {
        from: 'user',
        text: 'What is the weather in Berlin tomorrow?',
      },
      {
        from: 'assistant',
        blocks: [
          {text: 'Let me look that up for you.'},
          {
            call: {
              tool: 'get_weather',
              input: {
                city: 'Berlin',
                date: '2026-09-04',
                unit: 'celsius',
              },
            },
          },
        ],
      },
      {
        from: 'tool',
        data: {
          city: 'Berlin',
          date: '2026-09-04',
          temperature: 21.4,
          unit: 'celsius',
          condition: 'partly cloudy',
          precipitation: 10,
        },
      },
      {
        from: 'assistant',
        markdown: 'Around **21 ℃** and partly cloudy, with a 10% chance of rain.',
      },
    ],
  },
}
const codeReview: Preset = {
  id: 'code-review',
  title: 'Code review',
  description: 'Markdown, a code block and a before/after diff',
  input: {
    user: {name: 'Jaid'},
    assistant: {
      name: 'Codex',
      avatar: {
        src: 'assistant',
        background: '#7d5cff',
        scale: 75,
      },
    },
    chat: [
      {
        from: 'user',
        text: 'Can you make this debounce helper cancelable?',
      },
      {
        from: 'assistant',
        blocks: [
          {markdown: 'Sure — the trick is to keep the timer in a closure and return a `cancel` function:'},
          {
            code: {
              language: 'typescript',
              text: [
                'export const debounce = <A extends unknown[]>(fn: (...args: A) => void, ms: number) => {',
                '  let timer: ReturnType<typeof setTimeout> | undefined',
                '  const wrapped = (...args: A) => {',
                '    clearTimeout(timer)',
                '    timer = setTimeout(() => fn(...args), ms)',
                '  }',
                '  wrapped.cancel = () => clearTimeout(timer)',
                '  return wrapped',
                '}',
              ].join('\n'),
            },
          },
          {
            diff: {
              file: 'src/lib/useDebounced.ts',
              before: 'const value = input\n',
              after: 'const value = useDebounced(input, 200)\n',
            },
          },
        ],
      },
    ],
  },
}
const customSenders: Preset = {
  id: 'custom-senders',
  title: 'Custom senders',
  description: 'Additional senders with custom names, sides and avatars',
  input: {
    senders: {
      reviewer: {
        name: 'Reviewer',
        avatar: {
          src: 'tool',
          background: '#8a6d1f',
          scale: 80,
        },
      },
      me: {
        name: 'Me',
        side: 'ours',
        avatar: {
          src: 'user',
          background: '#12b3a8',
          scale: 85,
        },
      },
      bot: {
        name: 'Release Bot',
        avatar: {
          src: 'https://github.com/identicons/jaid.png',
          background: '#2b2b3c',
          scale: 100,
        },
      },
    },
    chat: [
      {
        from: 'me',
        text: 'Deploy is green, can someone take a look?',
      },
      {
        from: 'reviewer',
        markdown: 'Looks good. One nit: the **timeout** should be configurable.',
      },
      {
        from: 'bot',
        data: {
          release: 'v4.2.0',
          commit: '9f3c1ab',
          checks: {
            lint: 'pass',
            test: 'pass',
            build: 'pass',
          },
        },
      },
    ],
  },
}
const lightMode: Preset = {
  id: 'light-mode',
  title: 'Light mode',
  description: 'A bright mockup with a light background',
  input: {
    background: 'white',
    color: '#14161a',
    user: {
      name: 'Jaid',
      avatar: {
        src: 'user',
        background: '#ffd0f0',
        scale: 85,
      },
    },
    assistant: {
      name: 'Claude',
      avatar: {
        src: 'assistant',
        background: '#d6e9ff',
        scale: 80,
      },
    },
    chat: [
      {
        from: 'user',
        text: 'Summarize the release notes in three bullets.',
      },
      {
        from: 'assistant',
        blocks: [
          {
            markdown: [
              '- Faster cold starts',
              '- New `diff` content kind',
              '- PNG export at 2× scale',
              '',
              '```bash',
              'bun run build:production',
              '```',
            ].join('\n'),
          },
          {
            code: {
              language: 'bash',
              text: 'bun run build:production',
            },
          },
        ],
      },
    ],
  },
}
const everyBlock: Preset = {
  id: 'every-block',
  title: 'Every block kind',
  description: 'One message per content kind, including shortcuts and blocks combined',
  input: {
    style: {
      dataFlavor: 'yaml',
      messageWidth: '62ch',
    },
    chat: [
      {
        from: 'system',
        text: 'You are demonstrating every available content kind.',
      },
      {
        from: 'user',
        text: 'Plain text block',
        markdown: '**Markdown** block with `inline code`',
      },
      {
        from: 'assistant',
        blocks: [
          {
            image: '/metaverse.jxl',
            file: 'metaverse.jxl',
          },
        ],
      },
      {
        from: 'assistant',
        code: {
          language: 'python',
          text: 'print("Code block")',
        },
      },
      {
        from: 'assistant',
        data: {
          data: 'block',
          nested: {list: [1, 2, 3]},
        },
      },
      {
        from: 'assistant',
        call: {
          tool: 'search',
          input: {query: 'chat mockup'},
        },
      },
      {
        from: 'assistant',
        diff: {
          file: 'README.md',
          diff: '- old line\n+ new line\n  context line',
        },
      },
      {
        from: 'assistant',
        text: 'Shortcut first …',
        blocks: [
          {text: '… then an ordered block.'},
          {data: {ordered: true}},
        ],
      },
    ],
  },
}

export const presets: Array<Preset> = [
  paintingAnalysis,
  toolCall,
  codeReview,
  customSenders,
  lightMode,
  everyBlock,
]
