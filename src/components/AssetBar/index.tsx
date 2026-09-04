import type {Asset} from '../../lib/assets.ts'

import css from './style.module.sass'

export type AssetBarProps = {
  assets: Array<Asset>
  onRemove: (id: number) => void
}

const AssetBar = ({assets, onRemove}: AssetBarProps) => {
  if (!assets.length) {
    return
  }
  return <div className={css.bar}>
    <span className={css.label} title="Click a thumbnail to copy its ID">
      Images
    </span>
    {assets.map(asset => <span key={asset.id} className={css.asset}>
      <button
        type="button"
        className={css.thumb}
        title={`Copy the ID ${asset.id}`}
        onClick={() => void navigator.clipboard.writeText(String(asset.id))}
      >
        <img src={asset.url} alt={asset.name}/>
        <span className={css.id}>{asset.id}</span>
      </button>
      <button
        type="button"
        className={css.remove}
        title={`Remove ${asset.name}`}
        onClick={() => onRemove(asset.id)}
      >
        ×
      </button>
    </span>)}
  </div>
}

export default AssetBar
