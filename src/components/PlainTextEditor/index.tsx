import type {CodeEditorProps} from '../CodeEditor'

import css from './style.module.sass'

/** Emergency editor used only if the Monaco chunk cannot be loaded. */
const PlainTextEditor = ({value, issues, onChange}: CodeEditorProps) => {
  return <div className={css.editor}>
    <div className={css.notice}>Monaco could not load. Plain-text editing is still available.</div>
    <textarea
      aria-label="Chat YAML"
      aria-invalid={Boolean(issues?.length)}
      spellCheck={false}
      value={value}
      onChange={event => onChange(event.currentTarget.value)}
    />
  </div>
}

export default PlainTextEditor
