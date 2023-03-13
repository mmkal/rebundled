import {AsyncLocalStorage} from 'async_hooks'
import * as childProcess from 'child_process'
import * as fs from 'fs'
import type * as typefest from 'type-fest'
import type {MicrobundlePackageJsonProps} from './types'

import {getVersion} from './version'

const execSyncStorage = new AsyncLocalStorage<childProcess.ExecSyncOptions>()
export const runWithExecOptions = async <T>(options: childProcess.ExecSyncOptions, run: () => Promise<T>) => {
  return execSyncStorage.run({...execSyncStorage.getStore(), ...options}, run)
}

export const exec = (command: string, overrides?: childProcess.ExecSyncOptions) => {
  const store = execSyncStorage.getStore()
  log(`Running`, command)
  return childProcess.execSync(command, {...store, ...overrides})
}

export const logStorage = new AsyncLocalStorage<unknown[]>()
export const log = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log(...(logStorage.getStore() || []), ...args)
}

export const defaultGetRepo = (packageJson: typefest.PackageJson): string => {
  const githubBaseUrl = 'https://github.com/'
  const repository = typeof packageJson.repository === 'string' ? packageJson.repository : packageJson.repository?.url
  return `${githubBaseUrl}${repository}`
    .replace(githubBaseUrl + githubBaseUrl, githubBaseUrl)
    .replace(githubBaseUrl + 'git+', '')
}

export const updateFile = (filepath: string, update: (old: string) => string) => {
  const old = fs.readFileSync(filepath).toString()
  const updated = update(old)
  fs.writeFileSync(filepath, updated)
}

export const rebundledNote = (packageJson: typefest.PackageJson) =>
  `⚠️⚠️ **This is a [rebundled](https://github.com/mmkal/rebundled) version of ${packageJson.name}**! ⚠️⚠️`

export const preparePackageForMicrobundle = (
  packageJson: typefest.PackageJson,
  parameters: MicrobundlePackageJsonProps,
): void => {
  packageJson.name = `@rebundled/${packageJson.name!.split('/').slice(-1)[0]}`
  packageJson.type = 'module'
  delete packageJson.typings
  Object.assign(packageJson, parameters)
  packageJson.version = getVersion(packageJson)
}
