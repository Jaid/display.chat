import type {ConfigEnv, UserConfig, UserConfigFn} from 'vite'

import babelPlugin from '@rolldown/plugin-babel'
import reactPlugin, {reactCompilerPreset} from '@vitejs/plugin-react'
import postcssAutoprefixer from 'autoprefixer'
import cssnano from 'cssnano-preset-advanced'
import postcssNormalize from 'postcss-normalize'
import {fileURLToPath} from 'node:url'
import {mergeConfig} from 'vite'
import mediaMixinsPlugin from 'vite-plugin-media-mixins'
import titlePlugin from 'vite-plugin-title'

const getCommonConfig = () => {
  const config: UserConfig = {
    resolve: {
      alias: [
        {
          find: /^monaco-worker-manager$/,
          replacement: fileURLToPath(new URL('./src/lib/monacoWorkerManager.ts', import.meta.url)),
        }, {
          find: /^monaco-worker-manager\/worker$/,
          replacement: fileURLToPath(new URL('./src/lib/monacoWorkerManagerWorker.ts', import.meta.url)),
        },
      ],
    },
    optimizeDeps: {include: ['path-browserify']},
    build: {target: 'chrome152'},
    plugins: [titlePlugin(), reactPlugin(), babelPlugin({presets: [reactCompilerPreset()]}), mediaMixinsPlugin()],
    css: {postcss: {plugins: [postcssNormalize() as any, postcssAutoprefixer]}},
  }
  return config
}
const getDevelopmentConfig = (context: ConfigEnv) => {
  const config: UserConfig = {build: {outDir: `out/build/${context.mode}`}}
  return config
}
const getProductionConfig = () => {
  const cssnanoPlugins = cssnano().plugins.map(([createPlugin, options]) => createPlugin(options))
  const config: UserConfig = {
    build: {
      assetsDir: '',
// The preload helper would otherwise be shared between the entry and the lazily loaded editor
// chunk, which drags the whole Monaco bundle into the entry's static import graph.
      modulePreload: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2_000_000,
      minify: 'terser',
      rolldownOptions: {
        preserveEntrySignatures: false,
        treeshake: {propertyReadSideEffects: false},
        optimization: {
          inlineConst: {
            mode: 'all',
            pass: 100,
          },
        },
        output: {
          minify: true,
          topLevelVar: true,
          chunkFileNames: chunkInfo => {
            if (chunkInfo.name === 'rolldown-runtime') {
              return 'runtime.js'
            }
            return '[name].js'
          },
          assetFileNames: chunkInfo => {
            if (chunkInfo.names[0] === 'index.css') {
              return 'style.css'
            }
            return '[name].[ext]'
          },
// Shiki grammars are only reachable through dynamic imports, but they statically import each
// other for embedded languages, so they need explicit groups to stay out of the entry chunk.
          codeSplitting: {
            groups: [
              {
                name: 'preload',
                test: /preload-helper/,
                priority: 10,
              }, {
                name: 'react',
                test: /\/node_modules\/react(-dom)?\//,
                priority: 2,
              }, {
                name: 'monaco',
                test: /\/node_modules\/monaco-editor\//,
                priority: 3,
              }, {
                name: 'shiki-langs',
                test: /\/node_modules\/@shikijs\/langs\//,
                priority: 5,
              }, {
                name: 'shiki-themes',
                test: /\/node_modules\/@shikijs\/themes\//,
                priority: 5,
              }, {
                name: 'shiki',
                test: /\/node_modules\/@shikijs\//,
                priority: 4,
              }, {
                name: 'vendor',
                test: /node_modules/,
                priority: 1,
              },
            ],
          },
        },
        checks: {pluginTimings: false},
      },
    },
    css: {postcss: {plugins: cssnanoPlugins}},
  }
  return config
}
const commonConfig = getCommonConfig()
const config: UserConfigFn = context => mergeConfig(commonConfig, (context.mode === 'production' ? getProductionConfig : getDevelopmentConfig)(context))
export default config
