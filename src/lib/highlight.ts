import type {Highlighter} from './shiki.ts'

import {bundledLanguageIds, highlightThemes} from './languages.ts'

let highlighterPromise: Promise<Highlighter> | undefined
/**
 * Shiki is loaded on the first highlight request, so that neither its core nor its grammars end
 * up in the entry chunk.
 */
const loadHighlighter = async () => {
  const module = await import('./shiki.ts')
  return module.createAppHighlighter()
}
const getHighlighter = () => {
  highlighterPromise ??= loadHighlighter()
  return highlighterPromise
}
const cache = new Map<string, string>
const getCacheKey = (code: string, language: string) => `${language} ${code}`

export const getCachedHighlight = (code: string, language: string) => {
  return cache.get(getCacheKey(code, language))
}

const normalizeLanguage = (language: string) => {
  const normalized = language.trim().toLowerCase()
  return normalized.length ? normalized : 'text'
}
const isBundledLanguage = (language: string): language is (typeof bundledLanguageIds)[number] => {
  return (bundledLanguageIds as ReadonlyArray<string>).includes(language)
}

/**
 * Highlights code to Shiki HTML with both light and dark theme colors emitted as CSS variables.
 * Results are cached so that re-renders while typing stay synchronous.
 */
export const highlightCode = async (code: string, language: string) => {
  const key = getCacheKey(code, language)
  const cached = cache.get(key)
  if (cached !== undefined) {
    return cached
  }
  const highlighter = await getHighlighter()
  let lang = normalizeLanguage(language)
  if (lang !== 'text' && !highlighter.getLoadedLanguages().includes(lang)) {
    if (isBundledLanguage(lang)) {
      await highlighter.loadLanguage(lang)
    } else {
      lang = 'text'
    }
  }
  const html = highlighter.codeToHtml(code, {
    lang,
    themes: highlightThemes,
    defaultColor: false,
  })
  cache.set(key, html)
  return html
}
