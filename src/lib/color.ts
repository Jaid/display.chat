import Color from 'colorjs.io'

export type Rgb = readonly [number, number, number]

/** Parses any Color.js-supported CSS color in every environment, including SSR/tests. */
export const parseColor = (color: string): Rgb | undefined => {
  try {
    const [red, green, blue] = new Color(color).to('srgb').coords
    return [red, green, blue].map(channel => Math.max(0, Math.min(1, Number(channel))) * 255) as unknown as Rgb
  } catch {
    return undefined
  }
}

const getChannelLuminance = (value: number) => {
  const channel = value / 255
  return channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export const getLuminance = ([red, green, blue]: Rgb) => {
  return 0.2126 * getChannelLuminance(red) + 0.7152 * getChannelLuminance(green) + 0.0722 * getChannelLuminance(blue)
}

export const getContrastRatio = (a: Rgb, b: Rgb) => {
  const luminanceA = getLuminance(a)
  const luminanceB = getLuminance(b)
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

const white: Rgb = [255, 255, 255]
const black: Rgb = [0, 0, 0]

/** Picks whichever of black and white has the higher WCAG contrast ratio. */
export const getContrastColor = (background: string | undefined) => {
  if (!background) {
    return '#ffffff'
  }
  const rgb = parseColor(background)
  if (!rgb) {
    return '#ffffff'
  }
  return getContrastRatio(rgb, white) >= getContrastRatio(rgb, black) ? '#ffffff' : '#000000'
}

export const isLightColor = (background: string | undefined) => {
  if (!background) {
    return false
  }
  const rgb = parseColor(background)
  return rgb ? getLuminance(rgb) > 0.4 : false
}
