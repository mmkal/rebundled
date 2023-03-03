import rebundledPackageJson from '../package.json'
import type * as typefest from 'type-fest'
import * as childProcess from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {AsyncLocalStorage} from 'async_hooks'
import arg from 'arg'
import * as semver from 'semver'

const args = arg({
    '--prerelease': String,
    '--version': String,
    '--dry-run': Boolean,
    '--skip-cleanup': Boolean,
})

type Rebundlable = keyof typeof rebundledPackageJson['dependencies']

const execSyncStorage = new AsyncLocalStorage<childProcess.ExecSyncOptions>()

const exec = (command: string) => {
    const store = execSyncStorage.getStore()
    childProcess.execSync(command, store)
}

const logStorage = new AsyncLocalStorage<unknown[]>()
const log = (...args: unknown[]) => {
    console.log(...logStorage.getStore() || [], ...args)
}

type Script = (params: {packageJson: typefest.PackageJson; readmePath?: string}) => typefest.Promisable<void>

type RebundleConfig = {
    package: Rebundlable
    /** How to find the git repo for the given package. */
    repo?: (packageJson: typefest.PackageJson) => string
    scripts: {
        /** How to install dependencies for the source repo. e.g. `exec('npm install')` or `exec('yarn')` */
        install: Script
        /** How to modify the package before bundling. By default, modifies `name`, `main`, `exports`, `types`, `type` then calls `npm publish` */
        modify: Script
        /** How to bunle the package. Usually, exec a command like `microbundle` */
        bundle: Script
        /** How to publish the package, after install, modify and bundle. e.g. `exec('npm publish')` */
        publish: Script
    }
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
    updateFile(readmePath, old => [
        `⚠️⚠️ **This is a [rebundled](https://github.com/mmkal/rebundled) version of ${packageJson.name}**! ⚠️⚠️`,
        old,
    ].join('\n\n'))
}

export const preparePackageForMicrobundle = (sourceEntryPoint: string, packageJson: typefest.PackageJson): void => {
    packageJson.name = `@rebundled/${packageJson.name!.split('/').slice(-1)[0]}`
    packageJson.type = 'module'
    packageJson.source = sourceEntryPoint
    packageJson.main = 'dist/main.cjs'
    packageJson.module = 'dist/main.module.js'
    if (packageJson.exports) {
        throw new Error(`Not implemented yet: mapping all exports ${JSON.stringify(packageJson.exports)}. Specify a publish function explicitly`)
    }
    packageJson.exports = {
        require: 'dist/main.cjs',
        default: 'dist/main.modern.js'
    }
    packageJson.unpkg = 'dist/main.umd.js'
    if (packageJson.types || packageJson.typings) {
        delete packageJson.typings
        packageJson.types = 'dist/main.d.ts'
    }
    packageJson.files = ['dist']
    let version = args['--version'] || packageJson.version
    if (args['--prerelease']) {
        version = semver.inc(version!, 'prerelease', args['--prerelease'])!
        log(`New prerelease '${args['--prerelease']}' version:`, version)
    }
    packageJson.version = version!
}

const configs: RebundleConfig[] = [
    {
        package: 'truncate-json',
        scripts: {
            install: () => exec('npm install'),
            modify: ({packageJson, readmePath}) => {
                delete packageJson.exports
                preparePackageForMicrobundle('src/main.js', packageJson)
                packageJson.types = 'src/main.d.ts'
                packageJson.files?.push('src/main.d.ts')
                updateReadme({packageJson, readmePath})
            },
            bundle: () => exec(`microbundle --target node --generateTypes false --external none`),
            publish: () => exec('npm publish --access=public'),
        }
    },
]

export const rebundle = async (config: RebundleConfig) => {
    const {temporaryDirectory} = await import('tempy')
    const tempDir = temporaryDirectory()
    const doit = async () => {
        const readPackageJson = (filepath: string) => JSON.parse(fs.readFileSync(filepath).toString()) as typefest.PackageJson
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
            } else {
                await script('publish', `${gitPackage.name}@${gitPackage.version}`)
            }
        })
    }
    try {
        await logStorage.run([`package ${config.package}:`], async () => {
            await execSyncStorage.run({cwd: tempDir, stdio: 'inherit'}, doit)
        })
    }
    finally {
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

if (require.main === module){
    run()
}
