import type {Input} from './lib/schema.ts'

const input: Input = {
  user: {
    name: 'Jaid',
    avatar: '/jaid.jxl',
  },
  assistant: {
    name: 'Gemini 3.8 Flash',
    avatar: {
      src: '/gemini.svg',
      background: 'MintCream',
      scale: 75,
    },
  },
  chat: [
    {
      from: 'system',
      text: 'You are a helpful assistant that receives paintings and returns creator and year of creation as JSON. It’s more about providing flavor than historical accuracy, so you can make up appropriate data in case you can’t identify the media or don’t have reliable knowledge about it',
    }, {
      from: 'user',
      text: 'this one',
      image: '/metaverse.jxl',
    }, {
      from: 'assistant',
      data: {
        creator: 'Mark Zuckerberg',
        year: 2022,
      },
    },
  ],
}
export default input
