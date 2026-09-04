import type {RenderMessage} from '../../lib/blocks.ts'
import type {Style} from '../../lib/schema.ts'
import type {AssetLookup, ResolvedSender} from '../../lib/senders.ts'
import type {Range} from 'yaml'

import {getContrastColor} from '../../lib/color.ts'
import {getWidth, resolveStyle} from '../../lib/style.ts'
import Avatar from '../Avatar'
import ContentBlock from '../ContentBlock'

import css from './style.module.sass'

export type MessageProps = {
  assets: AssetLookup
  message: RenderMessage
  onJump: (range?: Range) => void
  rootStyle: Style | undefined
  sender: ResolvedSender
  showName: boolean
}

const Message = ({message, sender, rootStyle, showName, assets, onJump}: MessageProps) => {
  const style = resolveStyle(rootStyle, message.style)
  const background = message.style?.background ?? sender.background
  const color = getContrastColor(background)
  return <div className={css.message} data-side={sender.side}>
    <Avatar avatar={sender.avatar} name={sender.name} size={38}/>
    <div className={css.content} data-side={sender.side}>
      {showName ? <div className={css.name}>{sender.name}</div> : undefined}
      <div
        className={css.bubble}
        data-side={sender.side}
        style={{
          background,
          color,
          maxWidth: getWidth(style.messageWidth),
        }}
      >
        {message.blocks.map((block, blockIndex) => <ContentBlock
          key={blockIndex}
          block={block}
          style={style}
          assets={assets}
          onJump={() => onJump(block.range ?? message.range)}
        />)}
      </div>
    </div>
  </div>
}

export default Message
