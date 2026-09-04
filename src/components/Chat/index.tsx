import type {RenderMessage} from '../../lib/blocks.ts'
import type {ParsedInput} from '../../lib/schema.ts'
import type {AssetLookup} from '../../lib/senders.ts'
import type {Range} from 'yaml'

import {useMemo} from 'react'

import {emptyInput} from '../../lib/schema.ts'
import {createSenderResolver} from '../../lib/senders.ts'
import MessageStreak from '../MessageStreak'

import css from './style.module.sass'

export type ChatProps = {
  assets: AssetLookup
  input?: ParsedInput
  messages: Array<RenderMessage>
  onHover: (range?: Range) => void
  onJump: (range?: Range) => void
}

type MessageStreakData = {
  from: string
  messages: Array<RenderMessage>
}

const groupMessages = (messages: Array<RenderMessage>) => {
  const streaks: Array<MessageStreakData> = []
  for (const message of messages) {
    const previous = streaks.at(-1)
    if (previous?.from === message.from) {
      previous.messages.push(message)
    } else {
      streaks.push({from: message.from, messages: [message]})
    }
  }
  return streaks
}

const Chat = ({input, messages, assets, onHover, onJump}: ChatProps) => {
  const resolveSender = useMemo(() => createSenderResolver(input ?? emptyInput, assets), [input, assets])
  const visible = messages.filter(message => message.style?.visible !== false)
  const streaks = groupMessages(visible)
  return <div className={css.chat}>
    {streaks.map(streak => <MessageStreak
      key={streak.messages[0].index}
      messages={streak.messages}
      sender={resolveSender(streak.from)}
      rootStyle={input?.style}
      assets={assets}
      onHover={onHover}
      onJump={onJump}
    />)}
  </div>
}

export default Chat
