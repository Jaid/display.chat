import type {Input} from './schema.ts'
import type {BuiltinSenderId, Side} from './builtinSenders.ts'

import {startCase} from 'es-toolkit/string'

import {builtinSenderDefaults, isBuiltinSenderId} from './builtinSenders.ts'

export type {Side} from './builtinSenders.ts'

export type AvatarShape
  = | {radius: number
    shape?: 'rounded' | 'squircle'}
  | 'circle'
  | 'rounded'
  | 'square'
  | 'squircle'

export type ResolvedAvatar = {
  background: string
  /** Built-in glyphs are masked icons that must not be cropped. */
  glyph: boolean
  /** Foreground scale inside the background shape, in percent. */
  scale: number
  shape: AvatarShape
  /** A URL, an object URL of an imported picture, or a built-in glyph path. */
  src: string
}

export type ResolvedSender = {
  avatar: ResolvedAvatar
  /** Default message background, matching the avatar background. */
  background: string
  id: string
  name: string
  side: Side
}

export const getGlyphPath = (roleId: string) => `/avatars/${roleId}.svg`

export type AssetLookup = (id: number) => string | undefined

const resolveSrc = (src: number | string, assets: AssetLookup) => {
  if (typeof src === 'number') {
    return assets(src) ?? getGlyphPath('user')
  }
  if (isBuiltinSenderId(src)) {
    return getGlyphPath(src)
  }
  return src
}

/**
 * Resolves the effective properties of a sender, filling in defaults for everything the input
 * leaves out. Unknown sender IDs are treated as custom senders on the “theirs” side.
 */
export const resolveSender = (id: string, input: Input, assets: AssetLookup): ResolvedSender => {
  const isBuiltin = isBuiltinSenderId(id)
  const config = isBuiltin ? input[id] : input.senders?.[id]
  let fallbackId: BuiltinSenderId = isBuiltin ? id : 'assistant'
  if (!isBuiltin && config?.side === 'ours') {
    fallbackId = 'user'
  }
  const fallback = builtinSenderDefaults[fallbackId]
  const side = config?.side ?? fallback.side
  const avatarInput = config?.avatar
  const avatar: ResolvedAvatar = avatarInput !== undefined && typeof avatarInput === 'object' ? {
    src: resolveSrc(avatarInput.src, assets),
    background: avatarInput.background ?? fallback.background,
    shape: avatarInput.shape ?? 'circle',
    scale: avatarInput.scale ?? 100,
    glyph: typeof avatarInput.src === 'string' && isBuiltinSenderId(avatarInput.src),
  } : {
    src: avatarInput === undefined ? getGlyphPath(fallbackId) : resolveSrc(avatarInput, assets),
    background: fallback.background,
    shape: 'circle',
    scale: avatarInput === undefined ? fallback.scale : 100,
    glyph: avatarInput === undefined || typeof avatarInput === 'string' && isBuiltinSenderId(avatarInput),
  }
  return {
    id,
    name: config?.name ?? startCase(id),
    side,
    avatar,
    background: avatar.background,
  }
}

export type SenderResolver = (id: string) => ResolvedSender

export const createSenderResolver = (input: Input, assets: AssetLookup): SenderResolver => {
  const cache = new Map<string, ResolvedSender>
  return id => {
    let sender = cache.get(id)
    if (!sender) {
      sender = resolveSender(id, input, assets)
      cache.set(id, sender)
    }
    return sender
  }
}
