import JSON5 from 'json5'
import {stringify} from 'yaml'

export type Asset = {
  id: number
  name: string
  type: string
  url: string
}

const imageExtension = /\.(?:avif|gif|jpe?g|jxl|png|svg|webp)$/iu
const configurationExtension = /\.(?:json5?|ya?ml)$/iu

export const isImageFile = (file: File) => file.type.startsWith('image/') || imageExtension.test(file.name)

export const isConfigurationFile = (file: File) => {
  return configurationExtension.test(file.name)
    || ['application/json', 'application/yaml', 'text/yaml', 'text/x-yaml'].includes(file.type)
}

/** JSON and JSON5 imports are normalized to YAML because Monaco is intentionally a YAML editor. */
export const readConfigurationFile = async (file: File) => {
  const source = await file.text()
  if (/\.json5?$/iu.test(file.name) || file.type === 'application/json') {
    return stringify(JSON5.parse(source), {
      indent: 2,
      lineWidth: 0,
    })
  }
  return source
}

/** Returns the smallest non-negative integer that is not taken yet. */
export const getNextAssetId = (assets: ReadonlyArray<Asset>) => {
  const used = new Set(assets.map(asset => asset.id))
  let id = 0
  while (used.has(id)) {
    id++
  }
  return id
}

export const createAsset = (file: File, id: number): Asset => {
  return {
    id,
    name: file.name || `pasted-${id}`,
    url: URL.createObjectURL(file),
    type: file.type,
  }
}

export const addAssets = (assets: Array<Asset>, files: ReadonlyArray<File>) => {
  let next = assets
  for (const file of files) {
    const id = getNextAssetId(next)
    next = [...next, createAsset(file, id)]
  }
  return next
}

export const revokeAsset = (asset: Asset) => URL.revokeObjectURL(asset.url)
export const revokeAssets = (assets: ReadonlyArray<Asset>) => {
  for (const asset of assets) {
    revokeAsset(asset)
  }
}
