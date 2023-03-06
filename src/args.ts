import arg from 'arg'

export const args = arg({
  '--prerelease': String,
  '--bump': Boolean,
  '--version': String,
  '--dry-run': Boolean,
  '--include': String,
})
