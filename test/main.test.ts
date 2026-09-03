import {expect, test} from 'bun:test'

const {default: displayChat} = await import('#src/main.ts')

test('should run', () => {
  const result = displayChat()
  expect(result).toBe('display.chat') // TODO Test actual functionality
})
