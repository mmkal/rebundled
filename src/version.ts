import * as assert from 'assert'
import * as semver from 'semver'
import type * as typefest from 'type-fest'
import {Flags} from './flags'
import {exec, log} from './util'

export function getVersion(packageJson: typefest.PackageJson, flags: Flags) {
  let version: string | null | undefined = flags.version
  if (flags.bump) {
    version ||= packageJson.version
    let json = exec(`npm view ${packageJson.name} versions --json`, {stdio: undefined}).toString().trim()
    if (!json.startsWith('[')) json = `[${json}]` // weird npm view bug
    const list = JSON.parse(json) as string[]
    const [latest] = list.sort(semver.compare).slice(-1)
    const prerelease = semver.prerelease(latest)
    log(`Found published version`, latest)
    version = prerelease ? semver.inc(latest, 'prerelease') : semver.inc(latest, 'patch')
    log(`Bumped version`, version)
  } else if (flags.prerelease) {
    version ||= packageJson.version
    version = version && semver.inc(version, 'prerelease', flags.prerelease)!
    log(`New prerelease '${flags.prerelease}' version:`, version)
  } else if (flags.timestamp) {
    version ||= packageJson.version
    version = version && `${version}-${Date.now()}`
    log(`New timestamp version:`, version)
  }

  assert.ok(version, `couldn't get a version. Specify one with --version, or use --bump, --timestamp or --prerelease`)
  assert.ok(semver.valid(version), `invalid version: ${version}`)
  return version
}
