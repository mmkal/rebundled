import {exec, preparePackageForMicrobundle, updateReadme} from './index'
import type {RebundleConfig} from './types'

export const configs: RebundleConfig[] = [
  {
    package: 'truncate-json',
    scripts: {
      install: () => exec('npm install'),
      modify: async ({packageJson, readmePath}) => {
        delete packageJson.exports
        preparePackageForMicrobundle(packageJson, {
          source: './src/main.js',
          exports: ['require', 'default'],
        })
        packageJson.types = './src/main.d.ts'
        packageJson.files?.push('./src/main.d.ts')
        await updateReadme({packageJson, readmePath})
      },
      bundle: () => exec(`microbundle --target node --generateTypes false --external none`),
      publish: () => exec('npm publish --access=public'),
    },
  },
  {
    package: 'p-memoize',
    scripts: {
      install: () => exec('npm install'),
      modify({packageJson, readmePath}) {
        delete packageJson.exports
        preparePackageForMicrobundle(packageJson, {
          source: 'index.ts',
          exports: ['require', 'named'],
        })
        updateReadme({packageJson, readmePath})
      },
      bundle: () => exec(`microbundle --target node --external none`),
      publish: () => exec('echo npm publish --access=public'),
    },
  },
]
