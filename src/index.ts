import rebundledPackageJson from '../package.json'
import type * as typefest from 'type-fest'
import * as childProcess from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {AsyncLocalStorage} from 'async_hooks'

type Rebundlable = keyof typeof rebundledPackageJson['dependencies']

const execSyncStorage = new AsyncLocalStorage<childProcess.ExecSyncOptions>()

const exec = (command: string) => {
    const store = execSyncStorage.getStore()
    childProcess.execSync(command, store)
}

type Script = (packageJson: typefest.PackageJson) => typefest.Promisable<void>

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
}

const configs: RebundleConfig[] = [
    {
        package: 'truncate-json',
        scripts: {
            install: () => exec('npm install'),
            modify: packageJson => {
                delete packageJson.exports
                preparePackageForMicrobundle('src/main.js', packageJson)
                packageJson.types = 'src/main.d.ts'
                packageJson.files?.push('src/main.d.ts')
                
            },
            bundle: () =>  exec(`microbundle --target node --generateTypes false --external none`),
            publish: () => exec('echo npm publish'),
        }
    },
]

export const rebundle = async (config: RebundleConfig) => {
    const {temporaryDirectory} = await import('tempy')
    const tempDir = temporaryDirectory()
    await execSyncStorage.run({cwd: tempDir, stdio: 'inherit'}, async () => {
        const readPackageJson = (filepath: string) => JSON.parse(fs.readFileSync(filepath).toString()) as typefest.PackageJson
        const nodeModulesPackage = readPackageJson(path.join('node_modules', config.package, 'package.json'))
        const getRepo = config.repo || defaultGetRepo
        const gitRepo = getRepo(nodeModulesPackage)
        console.log(`Cloning ${config.package} into ${tempDir}. Git repo: ${gitRepo}`)
        exec(`git clone ${gitRepo}`)
        const folder = fs.readdirSync(tempDir)[0]
        await execSyncStorage.run({cwd: path.join(tempDir, folder), stdio: 'inherit'}, async () => {
            const packageJsonPath = path.join(tempDir, folder, 'package.json')
            const gitPackage = readPackageJson(packageJsonPath)
            const script = async (name: keyof RebundleConfig['scripts']) => {
                console.log(`Running ${name}`)
                await config.scripts[name](gitPackage)
            }
            await script('modify')
            await script('install')
            fs.writeFileSync(packageJsonPath, JSON.stringify(gitPackage, null, 2))
            await script('bundle')
            await script('publish')
        })
    })
}

const run = async () => {
    for (const config of configs) {
        await rebundle(config)
    }
}

if (require.main === module){
    run()
}
