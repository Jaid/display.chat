import type {Input} from './schema.ts'

import {startCase} from 'es-toolkit/string'

import {builtinSenderIds} from './schema.ts'

export type Side = 'ours' | 'theirs'

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

type BuiltinDefault = {
  background: string
  side: Side
}

export const builtinDefaults: Record<string, BuiltinDefault> = {
  system: {
    side: 'ours',
    background: '#b83b15',
  },
  user: {
    side: 'ours',
    background: '#ff5cce',
  },
  assistant: {
    side: 'theirs',
    background: '#3b9cf6',
  },
  tool: {
    side: 'theirs',
    background: '#2e7c38',
  },
}

export const getGlyphPath = (roleId: string) => `/avatars/${roleId}.svg`

export type AssetLookup = (id: number) => string | undefined

const resolveSrc = (src: number | string, assets: AssetLookup) => {
  if (typeof src === 'number') {
    return assets(src) ?? getGlyphPath('user')
  }
  if ((builtinSenderIds as ReadonlyArray<string>).includes(src)) {
    return getGlyphPath(src)
  }
  return src
}

/**
 * Resolves the effective properties of a sender, filling in defaults for everything the input
 * leaves out. Unknown sender IDs are treated as custom senders on the “theirs” side.
 */
export const resolveSender = (id: string, input: Input, assets: AssetLookup): ResolvedSender => {
  const isBuiltin = (builtinSenderIds as ReadonlyArray<string>).includes(id)
  const config = isBuiltin ? input[id as 'assistant' | 'system' | 'tool' | 'user'] : input.senders?.[id]
  let fallbackId = id
  if (!isBuiltin) {
    fallbackId = config?.side === 'ours' ? 'user' : 'assistant'
  }
  const fallback = builtinDefaults[fallbackId] ?? builtinDefaults.assistant
  const side = config?.side ?? fallback.side
  const avatarInput = config?.avatar
  const avatar: ResolvedAvatar = avatarInput !== undefined && typeof avatarInput === 'object' ? {
    src: resolveSrc(avatarInput.src, assets),
    background: avatarInput.background ?? fallback.background,
    shape: avatarInput.shape ?? 'circle',
    scale: avatarInput.scale ?? 90,
    glyph: typeof avatarInput.src === 'string' && (builtinSenderIds as ReadonlyArray<string>).includes(avatarInput.src),
  } : {
    src: avatarInput === undefined ? getGlyphPath(fallbackId) : resolveSrc(avatarInput, assets),
    background: fallback.background,
    shape: 'circle',
    scale: 90,
    glyph: avatarInput === undefined || typeof avatarInput === 'string' && (builtinSenderIds as ReadonlyArray<string>).includes(avatarInput),
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
