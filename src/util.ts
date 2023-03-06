import {AsyncLocalStorage} from 'async_hooks'
import * as childProcess from 'child_process'
import * as fs from 'fs'
import type * as typefest from 'type-fest'
import type {Script} from './types'

import {getVersion} from './version'

export const execSyncStorage = new AsyncLocalStorage<childProcess.ExecSyncOptions>()

export const exec = (command: string, overrides?: childProcess.ExecSyncOptions) => {
  const store = execSyncStorage.getStore()
  log(`Running`, command)
  return childProcess.execSync(command, {...store, ...overrides})
}

export const logStorage = new AsyncLocalStorage<unknown[]>()
export const log = (...args: unknown[]) => {
  console.log(...(logStorage.getStore() || []), ...args)
}

export const defaultGetRepo = (packageJson: typefest.PackageJson): string => {
  const githubBaseUrl = 'https://github.com/'
  const repository = typeof packageJson.repository === 'string' ? packageJson.repository : packageJson.repository?.url
  return `${githubBaseUrl}${repository}`.replace(githubBaseUrl + githubBaseUrl, githubBaseUrl)
}

export const updateFile = (filepath: string, update: (old: string) => string) => {
  const old = fs.readFileSync(filepath).toString()
  const updated = update(old)
  fs.writeFileSync(filepath, updated)
}

export const updateReadme = (
  {packageJson, readmePath}: Pick<Parameters<Script>[0], 'packageJson' | 'readmePath'>,
  ...additionalDocs: string[]
) => {
  if (!readmePath) return
  updateFile(readmePath, old =>
    [
      `⚠️⚠️ **This is a [rebundled](https://github.com/mmkal/rebundled) version of ${packageJson.name}**! ⚠️⚠️`,
      ...additionalDocs,
      old,
    ].join('\n\n'),
  )
}

export const preparePackageForMicrobundle = (
  packageJson: typefest.PackageJson,
  options: {source: string; exports: Array<'require' | 'default' | 'named'>},
): void => {
  packageJson.name = `@rebundled/${packageJson.name!.split('/').slice(-1)[0]}`
  packageJson.type = 'module'
  packageJson.source = options.source
  packageJson.main = './dist/main.cjs'
  packageJson.module = './dist/main.module.js'
  if (packageJson.exports) {
    throw new Error(
      `Not implemented yet: mapping all exports ${JSON.stringify(
        packageJson.exports,
      )}. Specify a publish function explicitly`,
    )
  }

  const exportsEntries = [
    ['require', './dist/main.cjs'],
    ['default', './dist/main.modern.js'],
    ['named', './dist/main.modern.js'],
  ] satisfies Array<[(typeof options.exports)[number], string]>
  packageJson.exports = Object.fromEntries(exportsEntries.filter(e => options.exports.includes(e[0])))
  packageJson.unpkg = './dist/main.umd.js'
  if (packageJson.types || packageJson.typings) {
    delete packageJson.typings
    packageJson.types = './dist/main.d.ts'
  }

  packageJson.files = ['dist']
  packageJson.version = getVersion(packageJson)
}
