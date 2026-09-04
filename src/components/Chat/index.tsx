import type {RenderMessage} from '../../lib/blocks.ts'
import type {ParsedInput} from '../../lib/schema.ts'
import type {AssetLookup} from '../../lib/senders.ts'
import type {Range} from 'yaml'

import {useMemo} from 'react'

import {emptyInput} from '../../lib/schema.ts'
import {createSenderResolver} from '../../lib/senders.ts'
import Message from '../Message'

import css from './style.module.sass'

export type ChatProps = {
  assets: AssetLookup
  input?: ParsedInput
  messages: Array<RenderMessage>
  onHover: (range?: Range) => void
  onJump: (range?: Range) => void
}

const Chat = ({input, messages, assets, onHover, onJump}: ChatProps) => {
  const resolveSender = useMemo(() => createSenderResolver(input ?? emptyInput, assets), [input, assets])
  const visible = messages.filter(message => message.style?.visible !== false)
  return <div className={css.chat}>
    {visible.map((message, index) => {
      const previous = visible[index - 1]
      const next = visible[index + 1]
      return <Message
        key={message.index}
        message={message}
        sender={resolveSender(message.from)}
        rootStyle={input?.style}
        showName={index === 0 || previous.from !== message.from}
        showAvatar={index === 0 || previous.from !== message.from}
        joinsPrevious={previous?.from === message.from}
        joinsNext={next?.from === message.from}
        assets={assets}
        onHover={onHover}
        onJump={onJump}
      />
    })}
  </div>
}

export default Chat
