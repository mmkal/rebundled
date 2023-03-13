import arg from 'arg'

export const args = arg({
  '--version': String,
  '--dry-run': Boolean,
  '--include': String,
})
