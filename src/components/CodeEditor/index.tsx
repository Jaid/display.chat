import type {SourceIssue} from '../../lib/parse.ts'
import type {BeforeMount, OnMount} from '@monaco-editor/react'
import type {editor} from 'monaco-editor/editor/editor.api'

import Editor, {loader} from '@monaco-editor/react'
import {once} from 'es-toolkit/function'
import {configureMonacoYaml} from 'monaco-yaml'
import {useCallback, useEffect, useRef} from 'react'

import {inputJsonSchema} from '../../lib/inputJsonSchema.ts'
import monaco, {ensureTheme, ensureYaml, setupMonacoEnvironment} from '../../lib/monaco.ts'
import {offsetToPosition} from '../../lib/sourcePosition.ts'

import css from './style.module.sass'

loader.config({monaco})
setupMonacoEnvironment()
const ensureSetupOnce = once((instance: typeof monaco) => {
  configureMonacoYaml(instance, {
    completion: true,
    hover: true,
    validate: false,
    format: {enable: false},
    schemas: [{
      uri: 'display.chat://schema/input.json',
      fileMatch: ['*'],
      schema: inputJsonSchema,
    }],
  })
  ensureTheme(instance)
  ensureYaml(instance)
})
const options: editor.IStandaloneEditorConstructionOptions = {
  minimap: {enabled: false},
  stickyScroll: {enabled: false},
  lineNumbers: 'off',
  fontFamily: 'code, ui-monospace, monospace',
  fontLigatures: true,
  fontSize: 13,
  tabSize: 2,
  dragAndDrop: false,
  accessibilitySupport: 'off',
  guides: {
    indentation: false,
  },
  lineHeight: 1.3,
  overviewRulerBorder: false,
  renderWhitespace: 'trailing',
  renderLineHighlight: 'none',
  wordWrap: 'on',
  pasteAs: {enabled: false},
  contextmenu: true,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  padding: {
    top: 14,
    bottom: 14,
  },
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false,
  },
  placeholder: 'Describe the chat in YAML, for example:\n\nchat:\n  - from: user\n    text: Hello',
}

export type CodeEditorProps = {
  issues?: Array<SourceIssue>
  onChange: (value: string) => void
  onReady: (instance: editor.IStandaloneCodeEditor) => void
  value: string
}

const CodeEditor = ({value, issues, onChange, onReady}: CodeEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const handleBeforeMount = useCallback<BeforeMount>(ensureSetupOnce, [])
  const handleMount = useCallback<OnMount>(instance => {
    editorRef.current = instance
    onReady(instance)
  }, [onReady])
  const handleChange = useCallback((next: string | undefined) => {
    onChange(next ?? '')
  }, [onChange])
  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (!model) {
      return
    }
    const markers: Array<editor.IMarkerData> = (issues ?? []).map(issue => {
      const start = offsetToPosition(value, issue.range?.[0] ?? 0)
      const end = offsetToPosition(value, issue.range?.[2] ?? issue.range?.[0] ?? 0)
      return {
        severity: monaco.MarkerSeverity.Error,
        message: issue.message,
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: Math.max(end.lineNumber, start.lineNumber),
        endColumn: end.lineNumber > start.lineNumber ? end.column : Math.max(end.column, start.column + 1),
      }
    })
    monaco.editor.setModelMarkers(model, 'chat', markers)
  }, [issues, value])
  return <div className={css.editor}>
    <Editor
      beforeMount={handleBeforeMount}
      theme="black"
      language="yaml"
      path="chat.yaml"
      value={value}
      options={options}
      onMount={handleMount}
      onChange={handleChange}
      loading={<div className={css.loading}>Loading editor…</div>}
    />
  </div>
}

export default CodeEditor
