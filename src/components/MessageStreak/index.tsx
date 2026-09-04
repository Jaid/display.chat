import type {RenderMessage} from '../../lib/blocks.ts'
import type {Style} from '../../lib/schema.ts'
import type {AssetLookup, ResolvedSender} from '../../lib/senders.ts'
import type {CSSProperties} from 'react'
import type {Range} from 'yaml'

import {getWidth, resolveStyle} from '../../lib/style.ts'
import Avatar from '../Avatar'
import Message from '../Message'

import css from './style.module.sass'

export type MessageStreakProps = {
  assets: AssetLookup
  messages: Array<RenderMessage>
  onHover: (range?: Range) => void
  onJump: (range?: Range) => void
  rootStyle: Style | undefined
  sender: ResolvedSender
}

const getMaxWidth = (messages: Array<RenderMessage>, rootStyle: Style | undefined) => {
  const widths = [...new Set(messages.map(message => getWidth(resolveStyle(rootStyle, message.style).messageWidth)).filter(Boolean))] as Array<string>
  if (widths.length === 1) {
    return widths[0]
  }
  return `max(${widths.join(', ')})`
}

const MessageStreak = ({messages, sender, rootStyle, assets, onHover, onJump}: MessageStreakProps) => {
  const messagesStyle: CSSProperties = {maxWidth: getMaxWidth(messages, rootStyle)}
  return <div className={css.streak} data-message-streak data-side={sender.side}>
    <Avatar avatar={sender.avatar} name={sender.name}/>
    <div className={css.content} data-side={sender.side}>
      <div className={css.name} style={{color: sender.color.name ?? sender.color.background.text}}>{sender.name}</div>
      <div className={css.messages} style={messagesStyle}>
        {messages.map((message, index) => <Message
          key={message.index}
          message={message}
          sender={sender}
          rootStyle={rootStyle}
          joinsPrevious={index > 0}
          joinsNext={index < messages.length - 1}
          assets={assets}
          onHover={onHover}
          onJump={onJump}
        />)}
      </div>
    </div>
  </div>
}

export default MessageStreak
