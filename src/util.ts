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
  log(`Running in ${store?.cwd?.toString()}:\n>`, command)
  return childProcess.execSync(command, {...store, ...overrides})
}

export const logStorage = new AsyncLocalStorage<unknown[]>()
export const log = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log(...(logStorage.getStore() || []), ...args)
}

export const defaultGetRepo = ({
  packageJson,
  installedVersion,
}: {
  packageJson: typefest.PackageJson
  installedVersion: string
}) => {
  const githubBaseUrl = 'https://github.com/'
  let repository: string | undefined
  let sha: string | undefined
  if (installedVersion.startsWith('github:')) {
    const parts = installedVersion.replace('github:', '').split('#')
    repository = parts[0]
    sha = parts[1]
  } else if (typeof packageJson.repository === 'string') {
    repository = packageJson.repository
  } else {
    repository = packageJson.repository?.url
  }

  if (!repository) {
    throw new Error(`Couldn't find a repository for ${packageJson.name}, version: ${installedVersion}`)
  }

  return {
    url: `${githubBaseUrl}${repository}`.replace(githubBaseUrl + githubBaseUrl, githubBaseUrl),
    sha,
  }
}

export const updateFile = (filepath: string, update: (old: string) => string) => {
  const old = fs.readFileSync(filepath).toString()
  const updated = update(old)
  fs.writeFileSync(filepath, updated)
}

export const rebundledNote = (packageJson: typefest.PackageJson) =>
  `⚠️⚠️ **This is a [rebundled](https://github.com/mmkal/rebundled) version of ${packageJson.name}**! ⚠️⚠️`

export const setPackageNameAndVersion = (packageJson: typefest.PackageJson) => {
  packageJson.name = `@rebundled/${packageJson.name!.split('/').at(-1)}`
  packageJson.version = getVersion(packageJson)
}

export const preparePackageForMicrobundle = (
  packageJson: typefest.PackageJson,
  parameters: MicrobundlePackageJsonProps,
): void => {
  packageJson.type = 'module'
  delete packageJson.typings // `parameters` requires the `types` property which is an alias for `typings`
  Object.assign(packageJson, parameters)
}
