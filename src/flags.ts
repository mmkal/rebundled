import {z} from 'zod'

export const Flags = z.object({
  include: z.string(),
  prerelease: z.string().optional(),
  bump: z.boolean().default(false),
  version: z.string().optional(),
  timestamp: z.boolean().default(false),
  dryRun: z.boolean().default(false),
})
export type Flags = z.infer<typeof Flags>
