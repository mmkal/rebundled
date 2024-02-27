import * as assert from 'assert'
import * as fs from 'fs'
import {glob} from 'glob'
import * as path from 'path'
import type * as typefest from 'type-fest'
import {args} from './args'
import type {RebundleConfig} from './types'
import {
  exec,
  log,
  runWithExecOptions,
  logStorage,
  defaultGetRepo,
  updateFile,
  setPackageNameAndVersion,
  getRebundledPackageJson,
} from './util'

export const rebundle = async (config: RebundleConfig) => {
  const rebundledPackageJson = getRebundledPackageJson()
  const parentDir = path.join('/tmp/rebundled', config.package)
  const doit = async () => {
    const readPackageJson = (filepath: string) => {
      const packageJsonString = fs.readFileSync(filepath).toString()
      return Object.assign(JSON.parse(packageJsonString) as typefest.PackageJson, {getRaw: () => packageJsonString})
    }

    const nodeModulesPackage = readPackageJson(path.join('node_modules', config.package, 'package.json'))
    const getRepo = config.repo || defaultGetRepo
    const gitRepo = getRepo({
      packageJson: nodeModulesPackage,
      installedVersion: rebundledPackageJson.dependencies![config.package]!,
    })

    fs.mkdirSync(parentDir, {recursive: true})
    exec(`rm -rf ${parentDir}/`)
    fs.mkdirSync(parentDir, {recursive: true})
    log(`Cloning into ${parentDir}. Git repo: ${JSON.stringify(gitRepo)}`)
    exec(`git clone ${gitRepo.url}`)

    const repoFolderName = fs.readdirSync(parentDir)[0]
    const repoDir = path.join(parentDir, repoFolderName)
    await runWithExecOptions({cwd: repoDir, stdio: 'inherit'}, async () => {
      if (gitRepo.sha) {
        exec('git status')
        exec('git pull origin')
        exec(`git reset --hard ${gitRepo.sha}`)
      }

      const projectPath = path.join(parentDir, repoFolderName)
      const packageJsonPath = path.join(projectPath, 'package.json')
      const gitPackage = readPackageJson(packageJsonPath)
      const originalPackageJson = JSON.parse(JSON.stringify(gitPackage)) as typefest.ReadonlyDeep<typefest.PackageJson>
      const script = async (name: keyof RebundleConfig['scripts'], ...logArgs: unknown[]) => {
        log(`running ${name}`, ...logArgs)
        await config.scripts[name]({
          originalPackageJson,
          packageJson: gitPackage,
          projectPath,
          async update({pattern, globOptions}, update) {
            const matches = await glob(pattern, {cwd: projectPath, absolute: true, ...globOptions})
            assert.ok(matches.length, `Expected matches for ${pattern.toString()}, got ${matches.length}`)
            for (const match of matches) {
              updateFile(match, update)
            }
          },
        })
      }

      setPackageNameAndVersion(gitPackage)

      await script('modify')
      await script('install')
      const whitespace = /\s+/.exec(gitPackage.getRaw())?.[0]?.replace(/^\n/, '') || 2
      fs.writeFileSync(packageJsonPath, JSON.stringify(gitPackage, null, whitespace) + '\n')
      await script('bundle')

      console.log('Difference vs original package:\n\n')
      exec('git --no-pager diff')
      console.log('\n\n')

      log(`Explore the generated package at ${projectPath}`)
      exec('echo "npm whoami: $(npm whoami)"')
      if (args['--dry-run']) {
        log(`Dry run: skipping publish`, `${gitPackage.name}@${gitPackage.version}`)
      } else {
        await script('publish', `${gitPackage.name}@${gitPackage.version}`)
      }
    })
  }

  await logStorage.run([`package ${config.package}:`], async () => {
    await runWithExecOptions({cwd: parentDir, stdio: 'inherit'}, doit)
  })
}
