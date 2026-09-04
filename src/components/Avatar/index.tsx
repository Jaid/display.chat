import type {AvatarShape, ResolvedAvatar} from '../../lib/senders.ts'
import type {CSSProperties} from 'react'

import css from './style.module.sass'

export type AvatarProps = {
  avatar: ResolvedAvatar
  className?: string
  name?: string
}

const getShapeStyle = (shape: AvatarShape): CSSProperties => {
  if (typeof shape === 'object') {
    return {
      borderRadius: `${shape.radius}px`,
      ...(shape.shape ?? 'squircle') === 'squircle' ? {cornerShape: 'squircle'} : undefined,
    }
  }
  switch (shape) {
    case 'square': {
      return {borderRadius: 0}
    }
    case 'squircle': {
      return {
        borderRadius: '30%',
        cornerShape: 'squircle',
      } as CSSProperties
    }
    case 'rounded': {
      return {borderRadius: '22%'}
    }
    default: {
      return {borderRadius: '50%'}
    }
  }
}
const Avatar = ({avatar, name, className}: AvatarProps) => {
  return <div
    className={className ? `${css.avatar} ${className}` : css.avatar}
    style={{
      background: avatar.background,
      ...getShapeStyle(avatar.shape),
    }}
  >
    <img
      className={css.image}
      src={avatar.src}
      alt={name ?? ''}
      style={{
        width: `${avatar.scale}%`,
        height: `${avatar.scale}%`,
        objectFit: avatar.glyph ? 'contain' : 'cover',
      }}
    />
  </div>
}

export default Avatar
