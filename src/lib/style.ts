import type {Font, MessageStyle, Style} from './schema.ts'
import type {CSSProperties} from 'react'

export const defaultStyle: Style = {
  dataFlavor: 'json5',
  messageWidth: '70ch',
}

/**
 * Merges the root style with a message style. Both are partial at runtime, because Zod only
 * applies the schema defaults when the object itself is present in the source.
 */
export const resolveStyle = (root?: Partial<Style>,
  message?: Partial<MessageStyle>): Style => {
  return {
    ...defaultStyle,
    ...root,
    ...message,
  }
}

export const getFontStyle = (font: Font | undefined): CSSProperties => {
  if (!font) {
    return {}
  }
  if (typeof font === 'string') {
    return {fontFamily: font}
  }
  return {
    ...font.family === undefined ? undefined : {fontFamily: font.family},
    ...font.weight === undefined ? undefined : {fontWeight: font.weight},
    ...font.variables === undefined ? undefined : {
      fontVariationSettings: Object.entries(font.variables)
        .map(([axis, value]) => `"${axis}" ${value}`)
        .join(', '),
    },
  }
}

export const getWidth = (width: number | string | undefined) => {
  if (width === undefined) {
    return
  }
  return typeof width === 'number' ? `${width}px` : width
}
