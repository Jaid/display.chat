import type {Asset} from '../../lib/assets.ts'
import type {Preset} from '../../lib/presets.ts'
import type {editor} from 'monaco-editor/editor/editor.api'
import type {LayoutStorage} from 'react-resizable-panels'
import type {Range} from 'yaml'

import {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useDropzone} from 'react-dropzone'
import {Group, Panel, Separator, useDefaultLayout} from 'react-resizable-panels'

import {addAssets, isConfigurationFile, isImageFile, readConfigurationFile, revokeAsset, revokeAssets} from '../../lib/assets.ts'
import {buildMessages} from '../../lib/blocks.ts'
import {parseSource} from '../../lib/parse.ts'
import {serializeInput} from '../../lib/serialize.ts'
import {offsetToPosition} from '../../lib/sourcePosition.ts'
import AssetBar from '../AssetBar'
import ErrorBar from '../ErrorBar'
import Mockup from '../Mockup'

import css from './style.module.sass'

// Monaco is by far the heaviest dependency, so it loads in its own chunk after first paint.
const CodeEditor = lazy(async () => {
  try {
    return await import('../CodeEditor')
  } catch {
    return import('../PlainTextEditor')
  }
})
// `useDefaultLayout` falls back to `localStorage` when no storage is given, which breaks outside
// the browser, so an inert storage is passed explicitly instead.
const memoryStorage: LayoutStorage = {
  getItem: () => null,
  setItem: () => {},
}
const getLayoutStorage = (): LayoutStorage => {
  const storage = (globalThis as {localStorage?: Storage}).localStorage
  return storage ?? memoryStorage
}
const App = () => {
  const [source, setSource] = useState('')
  const [importError, setImportError] = useState<string>()
  const [assets, setAssets] = useState<Array<Asset>>([])
  const assetsRef = useRef(assets)
  assetsRef.current = assets
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null)
  const sourceRef = useRef(source)
  sourceRef.current = source
  const parseResult = useMemo(() => parseSource(source), [source])
  const handleSourceChange = useCallback((value: string) => {
    setImportError(undefined)
    setSource(value)
  }, [])
  const messages = useMemo(() => {
    return parseResult.input ? buildMessages(parseResult.input.chat, parseResult.document) : []
  }, [parseResult])
  const empty = !source.trim()
  const assetLookup = useCallback((id: number) => {
    return assets.find(asset => asset.id === id)?.url
  }, [assets])
  const jumpToRange = useCallback((range?: Range) => {
    const instance = editorInstance
    if (!instance) {
      return
    }
    const position = offsetToPosition(sourceRef.current, range?.[0] ?? 0)
    instance.revealPositionInCenterIfOutsideViewport(position)
    instance.setPosition(position)
    instance.focus()
  }, [editorInstance])
  const handleDrop = useCallback(async (files: Array<File>) => {
    const images = files.filter(isImageFile)
    if (images.length) {
      setAssets(current => addAssets(current, images))
    }
    const document = files.findLast(isConfigurationFile)
    if (!document) {
      return
    }
    try {
      setSource(await readConfigurationFile(document))
      setImportError(undefined)
    } catch (error) {
      setImportError(`Could not import ${document.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [])
  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    // Dropzone intentionally ignores callback return values; awaiting here would block its event handler.
    // eslint-disable-next-line typescript/no-misused-promises
    onDrop: handleDrop,
    noClick: true,
    noKeyboard: true,
    noPaste: true,
  })
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const images = [...event.clipboardData?.files ?? []].filter(isImageFile)
      if (!images.length) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      setAssets(current => addAssets(current, images))
    }
    document.addEventListener('paste', handlePaste, true)
    return () => {
      document.removeEventListener('paste', handlePaste, true)
    }
  }, [])
  useEffect(() => {
    return () => revokeAssets(assetsRef.current)
  }, [])
  const handleSelectPreset = useCallback((preset: Preset) => {
    handleSourceChange(serializeInput(preset.input))
  }, [handleSourceChange])
  const handleRemoveAsset = useCallback((id: number) => {
    setAssets(current => {
      const removed = current.find(asset => asset.id === id)
      if (removed) {
        revokeAsset(removed)
      }
      return current.filter(asset => asset.id !== id)
    })
  }, [])
  const {defaultLayout, onLayoutChanged} = useDefaultLayout({
    id: 'display-chat',
    panelIds: ['editor', 'mockup'],
    storage: getLayoutStorage(),
  })
  return <div className={css.container} {...getRootProps()}>
    <input {...getInputProps()}/>
    <Group
      className={css.group}
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      <Panel id="editor" defaultSize="42" minSize="15" className={css.panel} style={{overflow: 'hidden'}}>
        <div className={css.editorPanel}>
          <div className={css.editorWrap}>
            <Suspense fallback={<div className={css.editorLoading}>Loading editor…</div>}>
              <CodeEditor
                value={source}
                issues={parseResult.issues}
                onChange={handleSourceChange}
                onReady={setEditorInstance}
              />
            </Suspense>
          </div>
          <AssetBar assets={assets} onRemove={handleRemoveAsset}/>
          <ErrorBar error={importError ?? parseResult.error}/>
        </div>
      </Panel>
      <Separator className={css.separator}>
        <div className={css.handle}/>
      </Separator>
      <Panel id="mockup" minSize="20" className={css.panel} style={{overflow: 'hidden'}}>
        <Mockup
          input={parseResult.input}
          messages={messages}
          assets={assetLookup}
          empty={empty}
          onJump={jumpToRange}
          onSelectPreset={handleSelectPreset}
        />
      </Panel>
    </Group>
    {isDragActive ? <div className={css.dropOverlay}>
      <span>Drop images to import them, or drop JSON/JSON5/YAML to replace the editor content</span>
    </div> : undefined}
  </div>
}

export default App
