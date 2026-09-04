import type {RenderMessage} from '../../lib/blocks.ts'
import type {Preset} from '../../lib/presets.ts'
import type {ParsedInput} from '../../lib/schema.ts'
import type {AssetLookup} from '../../lib/senders.ts'
import type {Range} from 'yaml'

import {useCallback, useRef, useState} from 'react'

import {copyPng, downloadPng} from '../../lib/exportImage.ts'
import {getFontStyle} from '../../lib/style.ts'
import Chat from '../Chat'
import Presets from '../Presets'
import Toolbar from '../Toolbar'

import css from './style.module.sass'

export type MockupProps = {
  assets: AssetLookup
  empty: boolean
  input?: ParsedInput
  messages: Array<RenderMessage>
  onJump: (range?: Range) => void
  onSelectPreset: (preset: Preset) => void
}

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error)
}
const Mockup = ({input, messages, assets, empty, onJump, onSelectPreset}: MockupProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string>()
  const setTemporaryStatus = useCallback((value: string) => {
    setStatus(value)
    setTimeout(() => {
      setStatus(current => {
        if (current === value) {
          return
        }
        return current
      })
    }, 2400)
  }, [])
  const handleCopy = useCallback(async () => {
    const node = canvasRef.current
    if (!node) {
      return
    }
    setBusy(true)
    try {
      await copyPng(node)
      setTemporaryStatus('Copied to clipboard')
    } catch (error) {
      setTemporaryStatus(`Copy failed: ${getErrorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }, [setTemporaryStatus])
  const handleDownload = useCallback(async () => {
    const node = canvasRef.current
    if (!node) {
      return
    }
    setBusy(true)
    try {
      await downloadPng(node)
      setTemporaryStatus('Download started')
    } catch (error) {
      setTemporaryStatus(`Export failed: ${getErrorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }, [setTemporaryStatus])
  const triggerCopy = useCallback(() => {
    // Export errors are handled inside handleCopy; the event handler intentionally starts it asynchronously.
    // eslint-disable-next-line typescript/no-floating-promises
    void handleCopy()
  }, [handleCopy])
  const triggerDownload = useCallback(() => {
    // Export errors are handled inside handleDownload; the event handler intentionally starts it asynchronously.
    // eslint-disable-next-line typescript/no-floating-promises
    void handleDownload()
  }, [handleDownload])
  const monoFamily = getFontStyle(input?.style?.monoFont).fontFamily
  return <div className={css.panel}>
    <div className={css.scroll}>
      <div
        className={css.canvas}
        ref={canvasRef}
        style={{
          background: input?.background ?? 'black',
          color: input?.color ?? 'white',
          ...getFontStyle(input?.style?.font),
          ...monoFamily === undefined ? undefined : {'--mono-font': monoFamily},
        }}
      >
        {empty ? <Presets onSelect={onSelectPreset}/> : <Chat input={input} messages={messages} assets={assets} onJump={onJump}/>}
      </div>
    </div>
    {empty ? undefined : <Toolbar onCopy={triggerCopy} onDownload={triggerDownload} busy={busy} status={status}/>}
  </div>
}

export default Mockup
