import arg from 'arg'
import {AsyncLocalStorage} from 'async_hooks'
import * as childProcess from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as semver from 'semver'
import type * as typefest from 'type-fest'
import {configs} from './configs'
import type {Script, RebundleConfig} from './types'

const args = arg({
  '--prerelease': String,
  '--version': String,
  '--dry-run': Boolean,
  '--skip-cleanup': Boolean,
})

const execSyncStorage = new AsyncLocalStorage<childProcess.ExecSyncOptions>()

export const exec = (command: string) => {
  const store = execSyncStorage.getStore()
  log(`Running`, command)
  childProcess.execSync(command, store)
}

const logStorage = new AsyncLocalStorage<unknown[]>()
const log = (...args: unknown[]) => {
  console.log(...(logStorage.getStore() || []), ...args)
}

const defaultGetRepo = (packageJson: typefest.PackageJson): string => {
  const githubBaseUrl = 'https://github.com/'
  return `${githubBaseUrl}${packageJson.repository}`.replace(githubBaseUrl + githubBaseUrl, githubBaseUrl)
}

export const updateFile = (filepath: string, update: (old: string) => string) => {
  const old = fs.readFileSync(filepath).toString()
  const updated = update(old)
  fs.writeFileSync(filepath, updated)
}

export const updateReadme: Script = ({packageJson, readmePath}) => {
  if (!readmePath) return
  updateFile(readmePath, old =>
    [
      `⚠️⚠️ **This is a [rebundled](https://github.com/mmkal/rebundled) version of ${packageJson.name}**! ⚠️⚠️`,
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
  let version = args['--version'] || packageJson.version
  if (args['--prerelease']) {
    version = semver.inc(version!, 'prerelease', args['--prerelease'])!
    log(`New prerelease '${args['--prerelease']}' version:`, version)
  }

  packageJson.version = version!
}

export const rebundle = async (config: RebundleConfig) => {
  const {temporaryDirectory} = await import('tempy')
  const tempDir = temporaryDirectory()
  const doit = async () => {
    const readPackageJson = (filepath: string) =>
      JSON.parse(fs.readFileSync(filepath).toString()) as typefest.PackageJson
    const nodeModulesPackage = readPackageJson(path.join('node_modules', config.package, 'package.json'))
    const getRepo = config.repo || defaultGetRepo
    const gitRepo = getRepo(nodeModulesPackage)

    log(`Cloning into ${tempDir}. Git repo: ${gitRepo}`)
    exec(`git clone ${gitRepo}`)
    const repoFolderName = fs.readdirSync(tempDir)[0]
    const repoDir = path.join(tempDir, repoFolderName)
    await execSyncStorage.run({cwd: repoDir, stdio: 'inherit'}, async () => {
      const packageJsonPath = path.join(tempDir, repoFolderName, 'package.json')
      const gitPackage = readPackageJson(packageJsonPath)
      const readmeFilename = fs.readdirSync(repoDir).find(filename => filename.toLowerCase() === 'readme.md')
      const readmePath = readmeFilename && path.join(repoDir, readmeFilename)
      const script = async (name: keyof RebundleConfig['scripts'], ...logArgs: unknown[]) => {
        log(`running ${name}`, ...logArgs)
        await config.scripts[name]({packageJson: gitPackage, readmePath})
      }

      await script('modify')
      await script('install')
      fs.writeFileSync(packageJsonPath, JSON.stringify(gitPackage, null, 2))
      await script('bundle')
      if (args['--dry-run']) {
        log(`Dry run: skipping publish`)
        exec('npm whoami')
      } else {
        await script('publish', `${gitPackage.name}@${gitPackage.version}`)
      }
    })
  }

  try {
    await logStorage.run([`package ${config.package}:`], async () => {
      await execSyncStorage.run({cwd: tempDir, stdio: 'inherit'}, doit)
    })
  } finally {
    if (args['--skip-cleanup']) {
      log(`Skipping cleanup of ${tempDir}`)
    } else {
      log(`Cleaning ${tempDir}`)
      exec(`rm -rf ${tempDir}`)
    }
  }
}

const run = async () => {
  for (const config of configs) {
    await logStorage.run([`package ${config.package}:`], async () => {
      await rebundle(config)
    })
  }
}

if (require.main === module) {
  run()
}
