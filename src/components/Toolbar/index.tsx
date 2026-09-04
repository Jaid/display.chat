import css from './style.module.sass'

export type ToolbarProps = {
  busy: boolean
  onCopy: () => void
  onDownload: () => void
  status?: string
}

const Toolbar = ({onCopy, onDownload, busy, status}: ToolbarProps) => {
  return <div className={css.toolbar}>
    <button type="button" className={css.button} data-export-button onClick={onCopy} disabled={busy}>
      Copy PNG
    </button>
    <button type="button" className={css.button} data-export-button onClick={onDownload} disabled={busy}>
      Download PNG
    </button>
    {status === undefined ? undefined : <span className={css.status}>{status}</span>}
  </div>
}

export default Toolbar
