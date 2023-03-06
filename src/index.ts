import * as fs from 'fs'
import * as path from 'path'
import type * as typefest from 'type-fest'
import {args} from './args'
import type {RebundleConfig} from './types'
import {exec, log, execSyncStorage, logStorage, defaultGetRepo} from './util'

export const rebundle = async (config: RebundleConfig) => {
  const parentDir = path.join(process.cwd(), 'generated/rebundled', config.package)
  const doit = async () => {
    const readPackageJson = (filepath: string) =>
      JSON.parse(fs.readFileSync(filepath).toString()) as typefest.PackageJson
    const nodeModulesPackage = readPackageJson(path.join('node_modules', config.package, 'package.json'))
    const getRepo = config.repo || defaultGetRepo
    const gitRepo = getRepo(nodeModulesPackage)

    fs.mkdirSync(parentDir, {recursive: true})
    exec(`rm -rf ${parentDir}/`)
    fs.mkdirSync(parentDir, {recursive: true})
    log(`Cloning into ${parentDir}. Git repo: ${gitRepo}`)
    exec(`git clone ${gitRepo}`)

    const repoFolderName = fs.readdirSync(parentDir)[0]
    const repoDir = path.join(parentDir, repoFolderName)
    await execSyncStorage.run({cwd: repoDir, stdio: 'inherit'}, async () => {
      const packageJsonPath = path.join(parentDir, repoFolderName, 'package.json')
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
        log(`Dry run: skipping publish`, `${gitPackage.name}@${gitPackage.version}`)
        exec('npm whoami')
      } else {
        await script('publish', `${gitPackage.name}@${gitPackage.version}`)
      }
    })
  }

  await logStorage.run([`package ${config.package}:`], async () => {
    await execSyncStorage.run({cwd: parentDir, stdio: 'inherit'}, doit)
  })
}
