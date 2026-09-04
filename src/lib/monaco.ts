import 'monaco-editor/features/register.all'

import * as monaco from 'monaco-editor/editor/editor.api'
import {conf as yamlConf, language as yamlLanguage} from 'monaco-editor/languages/definitions/yaml/yaml'

export default monaco

/**
 * Points Monaco at the bundled editor worker. Without this, Monaco tries to spawn a worker from
 * a CDN path that does not exist in the built app.
 */
export const setupMonacoEnvironment = () => {
  globalThis.MonacoEnvironment = {
    getWorker: () => new Worker(new URL('monacoWorker.ts', import.meta.url), {type: 'module'}),
  }
}

export const ensureTheme = (instance: typeof monaco) => {
  instance.editor.defineTheme('black', {
    base: 'vs-dark',
    inherit: true,
    colors: {
      'editor.background': '#000000',
      'editor.lineHighlightBorder': '#00000000',
    },
    rules: [],
  })
}

const yamlKey = String.raw`(?:[\w$\-.]+|"[^"]*"|'[^']*')`

/**
 * Registers YAML directly instead of through `monaco-editor/languages/definitions/yaml/register`,
 * because that module overwrites the language configuration with its own (much simpler) enter
 * rules as soon as the language is first encountered.
 */
export const ensureYaml = (instance: typeof monaco) => {
  instance.languages.register({
    id: 'yaml',
    extensions: ['.yaml', '.yml'],
    aliases: ['YAML', 'yaml', 'YML', 'yml'],
    mimetypes: ['application/x-yaml', 'text/x-yaml'],
  })
  instance.languages.setMonarchTokensProvider('yaml', yamlLanguage)
  const configuration = {
    ...yamlConf,
    onEnterRules: [
      ...yamlConf.onEnterRules ?? [],
      {
        // “- key: value” opens the mapping of a sequence item
        beforeText: new RegExp(String.raw`^\s*-\s+${yamlKey}:\s+\S.*$`, 'u'),
        action: {indentAction: instance.languages.IndentAction.Indent},
      },
      {
        // “key: value” continues the current mapping at the same level
        beforeText: new RegExp(String.raw`^\s*${yamlKey}:\s+\S.*$`, 'u'),
        action: {indentAction: instance.languages.IndentAction.None},
      },
      {
        // “- value” starts another item of the same sequence
        beforeText: /^(\s*)-\s+\S.*$/u,
        action: {indentAction: instance.languages.IndentAction.None},
      },
    ],
  }
  instance.languages.setLanguageConfiguration('yaml', configuration)
}
