/**
 * The Shiki grammars bundled with the app. Kept free of Shiki imports so that the highlighter
 * module can stay out of the entry chunk.
 */
export const bundledLanguageIds = [
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'dart',
  'diff',
  'dockerfile',
  'elixir',
  'go',
  'graphql',
  'haskell',
  'html',
  'http',
  'ini',
  'java',
  'javascript',
  'json',
  'json5',
  'jsonc',
  'jsx',
  'kotlin',
  'lua',
  'markdown',
  'nginx',
  'perl',
  'php',
  'powershell',
  'python',
  'r',
  'regexp',
  'ruby',
  'rust',
  'scala',
  'scss',
  'shellscript',
  'sql',
  'svelte',
  'swift',
  'toml',
  'tsx',
  'typescript',
  'vue',
  'xml',
  'yaml',
  'zig',
] as const

export type HighlightLanguage = typeof bundledLanguageIds[number]

export const highlightThemes = {
  dark: 'github-dark-default',
  light: 'github-light-default',
} as const

export type HighlightTheme = keyof typeof highlightThemes
