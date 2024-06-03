import {rebundle} from '.'
import {initTRPC} from '@trpc/server'
import {trpcCli} from 'trpc-cli'
import {configs} from './configs'
import {Flags} from './flags'
import {log, logStorage} from './util'

const t = initTRPC.create()

const router = t.router({
  rebundle: t.procedure.input(Flags).mutation(async ({input: flags}) => {
    for (const config of configs) {
      const included = flags.include === '*' || flags.include?.split(',').includes(config.package)
      if (!included) {
        log(`Skipping ${config.package}, not specified via --include`)
        continue
      }

      await logStorage.run([`package ${config.package}:`], async () => {
        await rebundle(config, flags)
      })
    }
  }),
})

const cli = trpcCli({
  router,
  default: {procedure: 'rebundle'},
})

void cli.run()
