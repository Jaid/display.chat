import type {RenderMessage} from '../../lib/blocks.ts'
import type {Style} from '../../lib/schema.ts'
import type {AssetLookup, ResolvedSender} from '../../lib/senders.ts'
import type {CSSProperties} from 'react'
import type {Range} from 'yaml'

import {getContrastColor} from '../../lib/color.ts'
import {getWidth, resolveStyle} from '../../lib/style.ts'
import Avatar from '../Avatar'
import ContentBlock from '../ContentBlock'

import css from './style.module.sass'

export type MessageProps = {
  assets: AssetLookup
  joinsNext: boolean
  joinsPrevious: boolean
  message: RenderMessage
  onHover: (range?: Range) => void
  onJump: (range?: Range) => void
  rootStyle: Style | undefined
  sender: ResolvedSender
  showAvatar: boolean
  showName: boolean
}

const Message = ({message, sender, rootStyle, showAvatar, showName, joinsPrevious, joinsNext, assets, onHover, onJump}: MessageProps) => {
  const style = resolveStyle(rootStyle, message.style)
  const background = message.style?.background ?? sender.color.background.text
  const codeBackground = sender.color.background.code
  const color = sender.color.text ?? getContrastColor(background)
  const bubbleStyle: CSSProperties & {'--bubble-background': string
    '--code-background': string} = {
    '--bubble-background': background,
    '--code-background': codeBackground,
    background,
    color,
    maxWidth: getWidth(style.messageWidth),
  }
  return <div
    className={css.message}
    data-message-index={message.index}
    data-side={sender.side}
    onMouseEnter={() => onHover(message.range)}
    onMouseLeave={() => onHover()}
  >
    {showAvatar ? <Avatar avatar={sender.avatar} name={sender.name}/> : <div className={css.avatarSpacer} aria-hidden="true"/>}
    <div className={css.content} data-side={sender.side}>
      {showName ? <div className={css.name} style={{color: sender.color.name ?? sender.color.background.text}}>{sender.name}</div> : undefined}
      <div
        className={css.bubble}
        data-side={sender.side}
        data-joins-previous={joinsPrevious}
        data-joins-next={joinsNext}
        style={bubbleStyle}
      >
        {message.blocks.map((block, blockIndex) => <ContentBlock
          key={blockIndex}
          block={block}
          style={style}
          assets={assets}
          onHover={() => onHover(block.range ?? message.range)}
          onLeave={() => onHover(message.range)}
          onJump={() => onJump(block.range ?? message.range)}
        />)}
      </div>
    </div>
  </div>
}

export default Message
