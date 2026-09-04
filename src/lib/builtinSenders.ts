export const builtinSenderIds = ['system', 'user', 'assistant', 'tool'] as const
export const senderSides = ['ours', 'theirs'] as const

export type BuiltinSenderId = typeof builtinSenderIds[number]
export type Side = typeof senderSides[number]

export type BuiltinSenderDefault = {
  background: string
  scale: number
  side: Side
}

/** Single source of truth for every built-in sender's visual and layout defaults. */
export const builtinSenderDefaults = {
  system: {
    side: 'ours',
    background: '#6d0505',
    scale: 70,
  },
  user: {
    side: 'ours',
    background: '#00810b',
    scale: 60,
  },
  assistant: {
    side: 'theirs',
    background: '#04003d',
    scale: 75,
  },
  tool: {
    side: 'theirs',
    background: '#4b2d00',
    scale: 70,
  },
} as const satisfies Record<BuiltinSenderId, BuiltinSenderDefault>

export const isBuiltinSenderId = (id: string): id is BuiltinSenderId => {
  return (builtinSenderIds as ReadonlyArray<string>).includes(id)
}

export const getBuiltinSenderInputDefault = <Id extends BuiltinSenderId>(id: Id) => {
  const defaults = builtinSenderDefaults[id]
  return {
    avatar: {
      src: id,
      background: defaults.background,
      scale: defaults.scale,
    },
    side: defaults.side,
  }
}
