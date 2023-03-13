import type * as typefest from 'type-fest'
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
  {
    package: 'json-schema-to-typescript',
    scripts: {
      install: () => exec('npm install --ignore-scripts'),
      async modify({packageJson, update}) {
        preparePackageForMicrobundle(packageJson, {
          source: './src/index.ts',
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
        await update({pattern: './src/index.ts'}, old =>
          old.replace(
            `import {readFileSync} from 'fs'`,
            [
              `const {readFileSync} = {`,
              `  // use eval so frontend bundlers can use (most of) this library without failing to load 'fs'`,
              `  readFileSync: (filepath: string) => (eval("require('fs')") as typeof import('fs')).readFileSync(filepath),`,
              `}`,
            ].join('\n'),
          ),
        )
        await update({pattern: './src/resolver.ts'}, old =>
          old
            .replace(
              `import $RefParser = require('@bcherny/json-schema-ref-parser')`,
              `const $RefParser = require('@bcherny/json-schema-ref-parser') as typeof import('@bcherny/json-schema-ref-parser')`,
            )
            .replace(
              // We replaced an import with a `const`, so we can't use exported types from the import anymore
              /\$RefParser.(\w+)/g,
              `import('@bcherny/json-schema-ref-parser').$1`,
            ),
        )
        await update({pattern: './tsconfig.json'}, old => {
          const json = JSON.parse(old) as Required<typefest.TsConfigJson>
          json.compilerOptions.declaration = true
          json.include = ['src']
          return JSON.stringify(json, null, 2)
        })
      },
      bundle: () =>
        exec(
          `microbundle --target web --external none --compress false --generateTypes false && tsc --emitDeclarationOnly`,
        ),
      publish: () => exec('npm publish --access=public'),
    },
  },
]
