import * as assert from 'assert'
import * as semver from 'semver'
import type * as typefest from 'type-fest'
import {args} from './args'
import {exec, log} from './util'

export function getVersion(packageJson: typefest.PackageJson) {
  let version: string | null | undefined = args['--version'] || packageJson.version
  if (args['--bump']) {
    let json = exec(`npm view ${packageJson.name} versions --json`, {stdio: undefined}).toString().trim()
    if (!json.startsWith('[')) json = `[${json}]` // weird npm view bug
    const list = JSON.parse(json) as string[]
    const [latest] = list.sort(semver.compare)
    const prerelease = semver.prerelease(latest)
    log(`Found published version`, latest)
    version = prerelease ? semver.inc(latest, 'prerelease') : semver.inc(latest, 'patch')
    log(`Bumped version`, version)
  } else if (args['--prerelease']) {
    version = version && semver.inc(version, 'prerelease', args['--prerelease'])!
    log(`New prerelease '${args['--prerelease']}' version:`, version)
  }

  assert.ok(version, `version must be defined`)
  return version
}
