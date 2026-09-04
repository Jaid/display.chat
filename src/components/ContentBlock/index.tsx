import type {ContentBlock, ContentKind} from '../../lib/blocks.ts'
import type {Style} from '../../lib/schema.ts'
import type {AssetLookup} from '../../lib/senders.ts'
import type {KeyboardEvent, ReactNode} from 'react'

import JSON5 from 'json5'
import {Children, isValidElement} from 'react'
import Markdown from 'react-markdown'
import {stringify} from 'yaml'

import {diffLines, formatDiff} from '../../lib/diff.ts'
import HighlightedCode from '../HighlightedCode'

import css from './style.module.sass'

export type ContentBlockProps = {
  assets: AssetLookup
  block: ContentBlock
  onJump: () => void
  style: Style
}

const serializeData = (value: unknown, flavor: Style['dataFlavor']) => {
  switch (flavor) {
    case 'json': {
      return {
        text: JSON.stringify(value, null, 2),
        language: 'json',
      }
    }
    case 'yaml': {
      return {
        text: stringify(value, {
          indent: 2,
          lineWidth: 0,
        }),
        language: 'yaml',
      }
    }
    default: {
      return {
        text: JSON5.stringify(value, null, 2),
        language: 'json5',
      }
    }
  }
}
const getNodeText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(getNodeText).join('')
  }
  if (isValidElement<{children?: ReactNode}>(node)) {
    return getNodeText(node.props.children)
  }
  return ''
}
const markdownComponents = {
  pre: ({children}: {children?: ReactNode}) => {
    const element = Children.toArray(children)[0]
    const props = isValidElement<{children?: ReactNode
      className?: string}>(element) ? element.props : undefined
    const language = props?.className?.replace(/^language-/u, '') ?? 'text'
    return <HighlightedCode code={getNodeText(props?.children).replace(/\n$/u, '')} language={language}/>
  },
  a: ({children, href}: {children?: ReactNode
    href?: string}) => {
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>
  },
}
const bleedKinds = new Set<ContentKind>(['image', 'code', 'data', 'diff'])
const getSelection = () => {
  const candidate = globalThis as {getSelection?: () => Selection | null}
  return candidate.getSelection ? candidate.getSelection() : undefined
}
const resolveImageSource = (block: Extract<ContentBlock, {kind: 'image'}>, assets: AssetLookup) => {
  if (typeof block.value === 'number') {
    return assets(block.value)
  }
  return block.value
}
const ContentBlockView = ({block, style, assets, onJump}: ContentBlockProps) => {
  const handleClick = () => {
    const selection = getSelection()
    if (selection && !selection.isCollapsed) {
      return
    }
    onJump()
  }
  let content: ReactNode
  switch (block.kind) {
    case 'text': {
      content = <div className={css.text}>{block.value}</div>
      break
    }
    case 'markdown': {
      content = <div className={css.markdown}><Markdown components={markdownComponents}>{block.value}</Markdown></div>
      break
    }
    case 'image': {
      const src = resolveImageSource(block, assets)
      content = src ? <figure className={css.image}>
        <img src={src} alt={block.file ?? ''}/>
        {block.file === undefined ? undefined : <figcaption className={css.caption}>{block.file}</figcaption>}
      </figure> : <div className={css.missing}>Missing image {block.value}</div>
      break
    }
    case 'code': {
      const code = typeof block.value === 'string' ? {
        text: block.value,
        language: undefined,
      } : block.value
      content = <>
        {block.file === undefined ? undefined : <div className={css.fileName}>{block.file}</div>}
        <HighlightedCode code={code.text} language={code.language ?? 'text'}/>
      </>
      break
    }
    case 'data': {
      const serialized = serializeData(block.value, style.dataFlavor)
      content = <HighlightedCode code={serialized.text} language={serialized.language}/>
      break
    }
    case 'call': {
      const serialized = block.value.input === undefined ? undefined : serializeData(block.value.input, style.dataFlavor)
      content = <div className={css.call}>
        <div className={css.callHeader}>
          <span className={css.callIcon} aria-hidden="true">⚙</span>
          <span className={css.callName}>{block.value.tool}</span>
        </div>
        {serialized === undefined ? undefined : <HighlightedCode code={serialized.text} language={serialized.language}/>}
      </div>
      break
    }
    case 'diff': {
      const fileName = block.file ?? block.value.file
      const text = 'diff' in block.value ? block.value.diff : formatDiff(diffLines(block.value.before, block.value.after))
      content = <>
        {fileName === undefined ? undefined : <div className={css.fileName}>{fileName}</div>}
        <HighlightedCode code={text} language="diff"/>
      </>
      break
    }
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    event.preventDefault()
    handleClick()
  }
  return <div
    className={css.block}
    data-kind={block.kind}
    data-bleed={bleedKinds.has(block.kind)}
    onClick={handleClick}
    onKeyDown={handleKeyDown}
    role="button"
    tabIndex={0}
    title="Jump to the source of this block"
  >
    {content}
  </div>
}

export default ContentBlockView
