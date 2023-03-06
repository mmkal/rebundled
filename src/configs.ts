import type {RebundleConfig} from './types'
import {exec, preparePackageForMicrobundle, updateFile, updateReadme} from './util'

export const configs: RebundleConfig[] = [
  {
    package: 'truncate-json',
    scripts: {
      install: () => exec('npm install --ignore-scripts --production'),
      async modify({packageJson, readmePath}) {
        delete packageJson.exports
        preparePackageForMicrobundle(packageJson, {
          source: './src/main.js',
          exports: ['require', 'default'],
        })
        packageJson.types = './src/main.d.ts'
        packageJson.files?.push('./src/main.d.ts')
        updateReadme({packageJson, readmePath})
      },
      bundle: () => exec(`microbundle --target node --generateTypes false --external none`),
      publish: () => exec('npm publish --access=public'),
    },
  },
  {
    package: 'p-memoize',
    scripts: {
      install: () => exec('npm install --ignore-scripts'),
      async modify({packageJson, projectPath, readmePath}) {
        delete packageJson.exports
        preparePackageForMicrobundle(packageJson, {
          source: 'index.ts',
          exports: ['require', 'named'],
        })
        packageJson.types = './dist/index.d.ts'
        packageJson.scripts = {}
        updateFile(projectPath + '/index.ts', old =>
          old.replace('export default function pMemoize', 'export function pMemoize'),
        )
        updateReadme(
          {packageJson, readmePath},
          "**Note**: the default import has been replaced with a named import, so you must use `import {pMemoize} from '@rebundled/p-memoize'` instead of `import pMemoize from 'p-memoize'`.",
        )
      },
      bundle: () => exec(`microbundle --target node --generateTypes true --external none`),
      publish: () => exec('npm publish --access=public'),
    },
  },
]
