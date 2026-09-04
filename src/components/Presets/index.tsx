import type {Preset} from '../../lib/presets.ts'

import {presets} from '../../lib/presets.ts'

import css from './style.module.sass'

export type PresetsProps = {
  onSelect: (preset: Preset) => void
}

const Presets = ({onSelect}: PresetsProps) => {
  return <div className={css.presets}>
    <div className={css.intro}>
      <h1 className={css.heading}>Describe a chat, get a mockup</h1>
      <p className={css.paragraph}>
        Write YAML on the left, or start from one of these examples. Drop or paste images anywhere to
        reference them by ID.
      </p>
    </div>
    <div className={css.grid}>
      {presets.map(preset => <button
        key={preset.id}
        type="button"
        className={css.preset}
        onClick={() => onSelect(preset)}
      >
        <span className={css.title}>{preset.title}</span>
        <span className={css.description}>{preset.description}</span>
      </button>)}
    </div>
  </div>
}

export default Presets
