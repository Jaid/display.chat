import type {SyntaxTheme} from '../../lib/schema.ts'

import {useEffect, useMemo, useState} from 'react'

import {getCachedHighlight, highlightCode} from '../../lib/highlight.ts'

import css from './style.module.sass'

export type HighlightedCodeProps = {
  className?: string
  code: string
  language?: string
  syntaxTheme?: SyntaxTheme
}

const HighlightedCode = ({code, language = 'text', syntaxTheme, className}: HighlightedCodeProps) => {
  const cached = useMemo(() => getCachedHighlight(code, language, syntaxTheme), [code, language, syntaxTheme])
  const [resolved, setResolved] = useState<{html: string
    key: string}>()
  const key = `${syntaxTheme ?? ''} ${language} ${code}`
  useEffect(() => {
    if (cached !== undefined) {
      return
    }
    let active = true
    // React effects cannot be async; this promise is cancelled logically via `active` on cleanup.
    // eslint-disable-next-line promise/prefer-await-to-then
    highlightCode(code, language, syntaxTheme).then(html => {
      if (active) {
        setResolved({
          key,
          html,
        })
      }
    }, () => {})
    return () => {
      active = false
    }
  }, [cached, code, key, language, syntaxTheme])
  const html = cached ?? (resolved?.key === key ? resolved.html : undefined)
  const classes = className ? `${css.code} ${className}` : css.code
  if (html === undefined) {
    return <pre className={classes} data-syntax-state="loading"><code>{code}</code></pre>
  }
  return <div className={classes} data-syntax-state="ready" dangerouslySetInnerHTML={{__html: html}}/>
}

export default HighlightedCode
