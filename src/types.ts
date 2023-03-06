import type * as glob from 'glob'
import type * as typefest from 'type-fest'
import type rebundledPackageJson from '../package.json'

type Rebundlable = keyof (typeof rebundledPackageJson)['dependencies']
type ScriptOutput = void | string | Buffer // `execSync` returns string | Buffer
export type Script = (params: {
  packageJson: typefest.PackageJson
  update(
    opts: {pattern: string | string[]; globOptions?: glob.GlobOptionsWithFileTypesUnset},
    update: (old: string) => string,
  ): Promise<void>
  projectPath: string
}) => typefest.Promisable<ScriptOutput>

export type RebundleConfig = {
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
