import * as assert from 'assert'
import * as semver from 'semver'
import type * as typefest from 'type-fest'
import {args} from './args'
import {exec, log} from './util'

export function getVersion(packageJson: typefest.PackageJson) {
  let {version} = packageJson
  if (args['--version']) {
    version = args['--version']
  } else {
    // get latest, bump it to get a prerelease version
    let json: string
    try {
      json = exec(`npm view ${packageJson.name} versions --json`, {stdio: undefined}).toString().trim()
      if (!json.startsWith('[')) json = `[${json}]` // weird npm view bug
    } catch {
      json = JSON.stringify([version])
    }

    const list = JSON.parse(json) as string[]
    const [latest] = list.sort(semver.compare).slice(-1)
    log(`Found published version`, latest)
    version = semver.inc(latest, 'prerelease')!
    log(`Bumped version`, version)
  }

  assert.ok(version, `version must be defined`)
  return version
}
