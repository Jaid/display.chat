import {useState} from 'react'

import css from './style.module.sass'

export type ErrorBarProps = {
  error?: string
}

const ErrorBar = ({error}: ErrorBarProps) => {
  const [expanded, setExpanded] = useState(false)
  if (!error) {
    return
  }
  const lines = error.split('\n')
  return <div className={css.bar}>
    <button
      type="button"
      className={css.toggle}
      onClick={() => setExpanded(!expanded)}
      title={expanded ? 'Collapse' : 'Expand'}
    >
      <span className={css.icon} aria-hidden="true">⚠</span>
      <span className={css.message}>{expanded ? error : lines[0]}</span>
      {lines.length > 1 ? <span className={css.more}>{expanded ? 'less' : `+${lines.length - 1}`}</span> : undefined}
    </button>
  </div>
}

export default ErrorBar
