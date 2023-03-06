import type {RebundleConfig} from './types'
import {exec, preparePackageForMicrobundle, updateReadme} from './util'

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
        await updateReadme({packageJson, readmePath})
      },
      bundle: () => exec(`microbundle --target node --generateTypes false --external none`),
      publish: () => exec('npm publish --access=public'),
    },
  },
  {
    package: 'p-memoize',
    scripts: {
      install: () => exec('npm install --ignore-scripts'),
      modify: async ({packageJson, readmePath}) => {
        delete packageJson.exports
        preparePackageForMicrobundle(packageJson, {
          source: 'index.ts',
          exports: ['require', 'named'],
        })
        packageJson.types = './dist/index.d.ts'
        packageJson.scripts = {}
        await updateReadme({packageJson, readmePath})
      },
      bundle: () => exec(`microbundle --target node --generateTypes true --external none`),
      publish: () => exec('npm publish --access=public'),
    },
  },
]
