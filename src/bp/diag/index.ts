import 'bluebird-global'
// eslint-disable-next-line import/order
import '../sdk/rewire'
// eslint-disable-next-line import/order

import { BotConfig } from 'botpress/sdk'

import { Workspace } from 'common/typings'
import { BotpressApp, createApp } from 'core/app/core-loader'
import { getOrCreate as redisFactory } from 'core/distributed/redis'
import fse from 'fs-extra'
import IORedis from 'ioredis'
import _ from 'lodash'
import moment from 'moment'
import nanoid from 'nanoid'
import os from 'os'
import path from 'path'
import stripAnsi from 'strip-ansi'
import yn from 'yn'
import { startMonitor } from './monitor'
import {
  printHeader,
  printObject,
  printRow,
  printSub,
  testWebsiteAccess,
  testWriteAccess,
  wrapMethodCall
} from './utils'

interface Options {
  config?: boolean
  includePasswords?: boolean
  outputFile?: string
  noExit?: boolean
  monitor?: boolean
}

export const OBFUSCATED = '***obfuscated***'
export const SECRET_KEYS = ['secret', 'pw', 'password', 'token', 'key', 'cert']
export const ENV_VARS = [
  'PORT',
  'DATABASE_URL',
  'DATABASE_POOL',
  'EXTERNAL_URL',
  'NODE_PATH',
  'NODE_ENV',
  'BPFS_STORAGE',
  'NATIVE_EXTENSIONS_DIR',
  'REDIS_URL',
  'PRO_ENABLED',
  'CLUSTER_ENABLED',
  'AUTO_MIGRATE',
  'REVERSE_PROXY',
  'APP_DATA_PATH',
  'USE_REDIS_STATE',
  'DISABLE_GLOBAL_SANDBOX',
  'DISABLE_BOT_SANDBOX',
  'DISABLE_TRANSITION_SANDBOX',
  'DISABLE_CONTENT_SANDBOX',
  'FORCE_TRAIN_ON_MOUNT',
  'VERBOSITY_LEVEL',
  'DEBUG',
  'PG_HOST',
  'PG_PORT',
  'DEBUG_LOGGER',
  'HOME',
  'APPDATA',
  'SKIP_MIGRATIONS',
  'MONITORING_INTERVAL',
  'REDIS_OPTIONS',
  'TZ',
  'LANG',
  'LC_ALL',
  'LC_TYPE',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY'
]

const PASSWORD_REGEX = new RegExp(/(.*):(.*)@(.*)/)
const REDIS_TEST_KEY = 'botpress_redis_test_key'
const REDIS_TEST_VALUE = nanoid()

let app: BotpressApp
let redisClient: IORedis.Redis
let includePasswords = false
let botpressConfig = undefined
let outputFile: string | undefined = undefined

export const print = (text: string) => {
  if (outputFile && typeof outputFile === 'string') {
    fse.appendFileSync(outputFile!, stripAnsi(text) + os.EOL, 'utf8')
  } else {
    console.info(text)
  }
}

const printModulesConfig = async (botId?: string) => {
  const ghost = botId ? app.ghost.forBot(botId) : app.ghost.global()
  const configs = await ghost.directoryListing('config/', '*.json')

  await Promise.mapSeries(configs, async file => {
    printSub(`${botId ? `Bot ${botId}` : 'Global'} - Module ${path.basename(file, '.json')}`)
    printObject(await ghost.readFileAsObject<any>('./config', file), includePasswords)
  })
}

const printGeneralInfos = () => {
  printHeader('General')
  printRow('Botpress Version', process.BOTPRESS_VERSION)
  printRow('Node Version', process.version.substr(1))
  printRow('Running Binary', process.pkg ? 'Yes' : 'No')
  printRow('Enterprise', process.IS_PRO_AVAILABLE ? (process.IS_PRO_ENABLED ? 'Enabled' : 'Available') : 'Unavailable')
  printRow('Hostname', os.hostname())
  printRow(
    'Host Information',
    `${process.distro} with ${os.cpus().length} CPUs and ${_.round(os.totalmem() / (1024 * 1024 * 1024))} GB RAM`
  )

  testWriteAccess('Executable Location', process.PROJECT_LOCATION)
  testWriteAccess('Data Folder', path.resolve(process.PROJECT_LOCATION, 'data'))
  testWriteAccess('App Data Folder', process.APP_DATA_PATH)
}

const testConnectivity = async () => {
  printHeader('Connectivity ')

  await wrapMethodCall('Connecting to Database', async () => {
    await app.database.initialize()
    printRow('Database Type', app.database.knex.isLite ? 'SQLite' : 'Postgres')

    if ((await app.database.knex.raw('select 1+1 as result')) === undefined) {
      throw new Error('Database error')
    }

    const useDbDriver = process.BPFS_STORAGE === 'database'
    await app.ghost.initialize(useDbDriver)
  })

  if (process.env.CLUSTER_ENABLED && redisFactory) {
    await wrapMethodCall('Connecting to Redis', async () => {
      redisClient = redisFactory('commands')

      if ((await redisClient.ping().timeout(3000)) !== 'PONG') {
        throw new Error("The server didn't answer our ping request after 3 seconds")
      }
    })

    await wrapMethodCall('Basic test of Redis', async () => {
      await redisClient.set(REDIS_TEST_KEY, REDIS_TEST_VALUE)
      const fetchValue = await redisClient.get(REDIS_TEST_KEY)
      await redisClient.del(REDIS_TEST_KEY)

      if (fetchValue !== REDIS_TEST_VALUE) {
        throw new Error('Could not complete a basic operation on Redis')
      }
    })

    try {
      // @ts-ignore typing missing for that method
      const reply = await redisClient.pubsub(['NUMSUB', 'job_done'])
      printRow('Botpress nodes listening on Redis', reply[1])
    } catch (err) {}
  }
}

const testNetworkConnections = async () => {
  printHeader('Network Connections')

  const hosts = [
    {
      label: 'Google (external access)',
      url: 'https://google.com'
    },
    {
      label: 'Licensing Server',
      url: `https://${process.env.BP_LICENSE_SERVER_HOST || 'license.botpress.io'}/prices`
    }
  ]

  try {
    const nluConfig = await app.ghost.global().readFileAsObject<any>('config/', 'nlu.json')
    const duckling = process.env.BP_MODULE_NLU_DUCKLINGURL || nluConfig?.ducklingURL
    const langServer =
      (process.env.BP_MODULE_NLU_LANGUAGESOURCES &&
        JSON.parse(process.env.BP_MODULE_NLU_LANGUAGESOURCES)[0]?.endpoint) ||
      nluConfig?.languageSources?.[0]?.endpoint

    if (duckling) {
      hosts.push({ label: 'Duckling Server', url: duckling })
    }

    if (langServer) {
      hosts.push({ label: 'Language Server', url: `${langServer}/languages` })
    }
  } catch (err) {}

  await Promise.map(hosts, host => testWebsiteAccess(host.label, host.url))
}

const printDatabaseTables = async () => {
  let tables
  if (app.database.knex.isLite) {
    tables = await app.database.knex
      .raw("SELECT name FROM sqlite_master WHERE type='table'")
      .then(res => res.map(x => x.name))
  } else {
    tables = await app.database
      .knex('pg_catalog.pg_tables')
      .select('tablename')
      .where({ schemaname: 'public' })
      .then(res => res.map(x => x.tablename))
  }

  printHeader('Database Tables')
  print(tables.sort().join(', '))
}

const listEnvironmentVariables = () => {
  printHeader('Environment Variables')

  const env = [...ENV_VARS, ...Object.keys(process.env).filter(x => x.startsWith('BP_') || x.startsWith('EXPOSED_'))]

  env
    .sort()
    .filter(x => process.env[x] !== undefined)
    .map(key => {
      let value = process.env[key]!

      if (!includePasswords) {
        if (PASSWORD_REGEX.test(value)) {
          value = value.replace(PASSWORD_REGEX, `$1:${OBFUSCATED}@$3`)
        } else if (SECRET_KEYS.find(x => key.toLowerCase().includes(x))) {
          value = OBFUSCATED
        }
      }

      printRow(key, value)
    })
}

const printConfig = async () => {
  printHeader('Botpress Config')
  printObject(botpressConfig, includePasswords)

  printHeader('Module Configuration')
  await printModulesConfig()
}

const printBotsList = async () => {
  const workspaces = await app.ghost.global().readFileAsObject<Workspace[]>('/', 'workspaces.json')
  const botIds = (await app.ghost.bots().directoryListing('/', 'bot.config.json')).map(path.dirname)

  await Promise.mapSeries(botIds, async botId => {
    printHeader(`Bot "${botId}" (workspace: ${workspaces.find(x => x.bots.includes(botId))?.id})`)

    const botConfig = await app.ghost.forBot(botId).readFileAsObject<BotConfig>('/', 'bot.config.json')
    printObject(botConfig, includePasswords)

    await printModulesConfig(botId)
  })
}

const printMigrationHistory = async () => {
  const history = await app.database
    .knex('srv_migrations')
    .select('*')
    .orderBy('created_at', 'desc')

  printHeader('Migration History')
  history.forEach(entry => {
    print(`Migration from ${entry.initialVersion} to ${entry.targetVersion} (${moment(entry.created_at)})`)
    print('_________________________________________________________________________________________________\n')
    print(`${entry.details}\n\n`)
  })
}

export default async function(options: Options) {
  app = createApp()
  includePasswords = options.includePasswords || yn(process.env.BP_DIAG_INCLUDE_PASSWORDS)
  outputFile = options.outputFile || yn(process.env.BP_DIAG_OUTPUT)

  printGeneralInfos()
  listEnvironmentVariables()

  await testConnectivity()
  try {
    // Must be after the connectivity test, but before network connections so we have duckling/lang server urls
    botpressConfig = await app.ghost.global().readFileAsObject<any>('/', 'botpress.config.json')
  } catch (err) {}

  await testNetworkConnections()

  if (options.config || yn(process.env.BP_DIAG_CONFIG)) {
    await printConfig()
    await printBotsList()
    await printDatabaseTables()
    await printMigrationHistory()
  }

  if (options.monitor || yn(process.env.BP_DIAG_MONITOR)) {
    await startMonitor(botpressConfig!, redisClient)
  } else if (!options.noExit) {
    process.exit(0)
  }
}
