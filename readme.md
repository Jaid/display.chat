# display.chat

A realtime, YAML-driven chat mockup renderer. The left pane is a local Monaco editor; the right pane renders the conversation immediately and can be copied or downloaded as a PNG.

## Features

- Two resizable editor/preview panes
- Local Monaco YAML editor with diagnostics and source jumps
- System, user, assistant, tool, and custom senders
- Built-in SVG avatars plus URL and imported-image avatars
- Text, Markdown, image, code, structured data, tool-call, and diff content
- Message-level visibility, colors, width, fonts, and serialization overrides
- Paste/drop image assets with stable integer IDs
- Drop JSON, JSON5, or YAML configuration files; JSON variants are normalized to YAML
- Shiki syntax highlighting with light/dark themes and lazy grammar loading
- PNG copy/download after fonts, images, and highlighting have settled
- Empty-editor presets covering the major schema capabilities
- No CDN/runtime network dependency for Monaco or syntax highlighting

## Development

```sh
bun install
bun run dev
```

Validation:

```sh
bun run lint
bun run test
bun run build
bun run test:live
```

The live suite launches the locally installed Chrome and Firefox binaries.

## Input

The editor accepts YAML. JSON and JSON5 are also understood directly, while dropped JSON/JSON5 files are converted to YAML so source navigation remains precise.

```yaml
background: black
color: white

user:
  name: Jaid

assistant:
  name: Assistant
  avatar:
    src: assistant
    background: '#3b9cf6'
    scale: 80

senders:
  reviewer:
    name: Reviewer
    side: theirs
    avatar:
      src: tool
      background: '#8a6d1f'

style:
  dataFlavor: json5
  syntaxTheme: vesper
  messageWidth: 70ch

chat:
  - from: user
    text: Show me the implementation.

  - from: assistant
    markdown: '**Done.** Here is the relevant part:'
    blocks:
      - code:
          language: typescript
          text: |
            export const answer = 42
        file: src/example.ts
      - data:
          answer: 42

  - from: reviewer
    call:
      tool: inspect
      input:
        file: src/example.ts
```

### Content shortcuts

A message may put any content kind directly on the message and may combine multiple shortcuts with an ordered `blocks` array. Shortcut properties render in their YAML source order; explicit blocks render afterwards in array order.

Supported kinds are `text`, `markdown`, `image`, `code`, `data`, `call`, and `diff`. Code and image blocks optionally accept `file`.

`style.syntaxTheme` accepts any bundled Shiki theme ID, such as `vesper`, `nord`, `tokyo-night`, or `catppuccin-mocha`. Message-level `style.syntaxTheme` overrides the root style for that message.

### Images

Paste or drop images anywhere in the app. Each image receives the lowest unused non-negative integer ID, visible below the editor. Use that integer anywhere an image or avatar source is accepted. Removing an asset releases its object URL.

### Source navigation

Click a rendered block—or focus it and press Enter/Space—to move Monaco to its source. Explicit `blocks` entries jump to the exact block. Direct content shortcuts intentionally jump to their containing message.

## Build

Production builds are split so React, Monaco, and Shiki stay out of the initial entry chunk where possible. Monaco and Shiki are bundled locally; there is no CDN fallback. A plain-text editor is bundled as an emergency fallback if the Monaco chunk cannot load.
