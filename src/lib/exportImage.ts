import {domToBlob} from 'modern-screenshot'

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
const waitForSyntaxHighlighting = async (node: HTMLElement) => {
  const deadline = performance.now() + 10_000
  while (node.querySelector('[data-syntax-state="loading"]') && performance.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 32))
  }
}

/** Ensures fonts, images, and async Shiki rendering are stable before taking a capture. */
export const prepareCapture = async (node: HTMLElement) => {
  await document.fonts.ready
  await waitForSyntaxHighlighting(node)
  await Promise.all(Array.from(node.querySelectorAll('img'), image => image.decode().catch(() => {})))
  await nextFrame()
  await nextFrame()
}

export const renderPng = async (node: HTMLElement, scale = 2) => {
  await prepareCapture(node)
  return domToBlob(node, {
    type: 'image/png',
    scale,
  })
}

export const copyPng = async (node: HTMLElement) => {
  const blob = await renderPng(node)
  await navigator.clipboard.write([new ClipboardItem({'image/png': blob})])
}

const fileName = () => {
  const stamp = (new Date).toISOString().replaceAll(/[.:]/gu, '-').replace(/Z$/u, '')
  return `display-chat-${stamp}.png`
}

export const downloadPng = async (node: HTMLElement, name = fileName()) => {
  const blob = await renderPng(node)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
