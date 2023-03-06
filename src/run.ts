import {rebundle} from './index'
import {args} from './args'
import {configs} from './configs'
import {log, logStorage} from './util'

const run = async () => {
  for (const config of configs) {
    const included = args['--include'] === '*' || args['--include']?.split(',').includes(config.package)
    if (!included) {
      log(`Skipping ${config.package}, not specified via --include`)
      continue
    }

    await logStorage.run([`package ${config.package}:`], async () => {
      await rebundle(config)
    })
  }
}

if (require.main === module) {
  void run()
}
