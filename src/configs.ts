import type {RebundleConfig} from './types'
import {exec, preparePackageForMicrobundle, rebundledNote} from './util'

export const configs: RebundleConfig[] = [
  {
    package: 'truncate-json',
    scripts: {
      install: () => exec('npm install --ignore-scripts --production'),
      async modify({packageJson, update}) {
        preparePackageForMicrobundle(packageJson, {
          source: './src/main.js',
          type: 'module',
          exports: {
            require: './dist/main.cjs',
            import: './dist/main.modern.js',
          },
          main: './dist/main.cjs',
          module: './dist/main.module.js',
          types: './src/main.d.ts',
          files: ['dist', 'src/main.d.ts'],
          unpkg: './dist/main.umd.js',
        })
        await update({pattern: './README.md'}, old => [rebundledNote(packageJson), old].join('\n\n'))
      },
      bundle: () => exec(`microbundle --target node --generateTypes false --external none`),
      publish: () => exec('npm publish --access=public'),
    },
  },
  {
    package: 'p-memoize',
    scripts: {
      install: () => exec('npm install --ignore-scripts'),
      async modify({packageJson, update}) {
        preparePackageForMicrobundle(packageJson, {
          source: './index.ts',
          type: 'module',
          exports: {
            require: './dist/main.cjs',
            import: './dist/main.modern.js',
          },
          main: './dist/main.cjs',
          module: './dist/main.module.js',
          types: './dist/index.d.ts',
          files: ['dist', 'src/main.d.ts'],
          unpkg: './dist/main.umd.js',
        })
        packageJson.scripts = {} // prevent weird side effects on prepublish etc.
        await update({pattern: './index.ts'}, old =>
          old.replace('export default function pMemoize', 'export function pMemoize'),
        )
        await update({pattern: './readme.md'}, old =>
          [
            rebundledNote(packageJson),
            "**Note**: the default import has been replaced with a named import, so you must use `import {pMemoize} from '@rebundled/p-memoize'` instead of `import pMemoize from 'p-memoize'`.",
            old,
          ].join('\n\n'),
        )
      },
      bundle: () => exec(`microbundle --target node --generateTypes true --external none`),
      publish: () => exec('npm publish --access=public'),
    },
  },
]
