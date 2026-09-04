import type {BunPlugin} from 'bun'

/**
 * Stubs the Vite-specific imports that Bun cannot resolve on its own, so that components can be
 * rendered with `react-dom/server` in tests:
 * - `*.module.sass` becomes a map of class names
 * - `*?worker` becomes a stub worker constructor
 */
const testSassModulesPlugin: BunPlugin = {
  name: 'test-sass-modules',
  setup(build) {
    build.onLoad({filter: /\.module\.sass$/}, async args => {
      const source = await Bun.file(args.path).text()
      const classNames = [...new Set(Array.from(source.matchAll(/^\s*\.([A-Z_a-z][\w-]*)/gm), match => match[1]).filter(Boolean))]
      return {
        contents: `export default ${JSON.stringify(Object.fromEntries(classNames.map(className => [className, className])))}`,
        loader: 'js',
      }
    })
    build.onLoad({filter: /\?worker$/}, () => {
      return {
        contents: 'export default class StubWorker {}',
        loader: 'js',
      }
    })
  },
}

export default testSassModulesPlugin
