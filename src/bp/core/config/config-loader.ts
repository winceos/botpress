import { BotConfig, Logger } from 'botpress/sdk'
import { ObjectCache } from 'common/object-cache'
import { calculateHash, stringify } from 'core/misc/utils'
import ModuleResolver from 'core/modules/resolver'
import { GhostService } from 'core/services'
import { TYPES } from 'core/types'
import { FatalError } from 'errors'
import fs from 'fs'
import { inject, injectable } from 'inversify'
import defaultJsonBuilder from 'json-schema-defaults'
import _, { PartialDeep } from 'lodash'
import path from 'path'

import { BotpressConfig } from './botpress.config'

/**
 * These properties should not be considered when calculating the config hash
 * They are always read from the configuration file and can be dynamically changed
 */
const removeDynamicProps = config => _.omit(config, ['superAdmins'])

@injectable()
export class ConfigProvider {
  public onBotpressConfigChanged: ((initialHash: string, newHash: string) => Promise<void>) | undefined

  private _botpressConfigCache: BotpressConfig | undefined
  public initialConfigHash: string | undefined
  public currentConfigHash!: string

  constructor(
    @inject(TYPES.GhostService) private ghostService: GhostService,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ObjectCache) private cache: ObjectCache
  ) {
    this.cache.events.on('invalidation', async key => {
      if (key === 'object::data/global/botpress.config.json') {
        this._botpressConfigCache = undefined
        const config = await this.getBotpressConfig()

        this.currentConfigHash = calculateHash(JSON.stringify(removeDynamicProps(config)))
        this.onBotpressConfigChanged && this.onBotpressConfigChanged(this.initialConfigHash!, this.currentConfigHash)
      }
    })
  }

  async getBotpressConfig(): Promise<BotpressConfig> {
    if (this._botpressConfigCache) {
      return this._botpressConfigCache
    }

    await this.createDefaultConfigIfMissing()

    const config = await this.getConfig<BotpressConfig>('botpress.config.json')

    config.httpServer.port = process.env.PORT ? parseInt(process.env.PORT) : config.httpServer.port
    config.httpServer.host = process.env.BP_HOST || config.httpServer.host
    process.PROXY = process.core_env.BP_PROXY || config.httpServer.proxy

    if (config.pro) {
      config.pro.licenseKey = process.env.BP_LICENSE_KEY || config.pro.licenseKey
    }

    this._botpressConfigCache = config

    if (!this.initialConfigHash) {
      this.initialConfigHash = calculateHash(JSON.stringify(removeDynamicProps(config)))
    }

    return config
  }

  async mergeBotpressConfig(partialConfig: PartialDeep<BotpressConfig>, clearHash?: boolean): Promise<void> {
    this._botpressConfigCache = undefined
    const content = await this.ghostService.global().readFileAsString('/', 'botpress.config.json')
    const config = _.merge(JSON.parse(content), partialConfig)

    await this.ghostService.global().upsertFile('/', 'botpress.config.json', stringify(config))

    if (clearHash) {
      this.initialConfigHash = undefined
    }
  }

  async getBotConfig(botId: string): Promise<BotConfig> {
    return this.getConfig<BotConfig>('bot.config.json', botId)
  }

  async setBotConfig(botId: string, config: BotConfig, ignoreLock?: boolean) {
    await this.ghostService.forBot(botId).upsertFile('/', 'bot.config.json', stringify(config), { ignoreLock })
  }

  async mergeBotConfig(botId: string, partialConfig: PartialDeep<BotConfig>, ignoreLock?: boolean): Promise<BotConfig> {
    const originalConfig = await this.getBotConfig(botId)
    const config = _.merge(originalConfig, partialConfig)
    await this.setBotConfig(botId, config, ignoreLock)
    return config
  }

  public async createDefaultConfigIfMissing() {
    if (!(await this.ghostService.global().fileExists('/', 'botpress.config.json'))) {
      await this._copyConfigSchemas()

      const botpressConfigSchema = await this.ghostService
        .root()
        .readFileAsObject<any>('/', 'botpress.config.schema.json')
      const defaultConfig: BotpressConfig = defaultJsonBuilder(botpressConfigSchema)

      const config = {
        $schema: `../botpress.config.schema.json`,
        ...defaultConfig,
        modules: await this.getModulesListConfig(),
        version: process.BOTPRESS_VERSION
      }

      await this.ghostService.global().upsertFile('/', 'botpress.config.json', stringify(config))
    }
  }

  private async _copyConfigSchemas() {
    const schemasToCopy = ['botpress.config.schema.json', 'bot.config.schema.json']

    for (const schema of schemasToCopy) {
      const schemaContent = fs.readFileSync(path.join(__dirname, 'schemas', schema))
      await this.ghostService.root().upsertFile('/', schema, schemaContent)
    }
  }

  public async getModulesListConfig() {
    const enabledByDefault = [
      'analytics',
      'basic-skills',
      'builtin',
      'channel-web',
      'nlu',
      'qna',
      'extensions',
      'code-editor',
      'testing',
      'examples'
    ]

    // here it's ok to use the module resolver because we are discovering the built-in modules only
    const resolver = new ModuleResolver(this.logger)
    return await resolver.getModulesList().map(module => {
      return { location: `MODULES_ROOT/${module}`, enabled: enabledByDefault.includes(module) }
    })
  }

  private async getConfig<T>(fileName: string, botId?: string): Promise<T> {
    try {
      let content: string

      if (botId) {
        content = await this.ghostService
          .forBot(botId)
          .readFileAsString('/', fileName)
          .catch(_err => this.ghostService.forBot(botId).readFileAsString('/', fileName))
      } else {
        content = await this.ghostService
          .global()
          .readFileAsString('/', fileName)
          .catch(_err => this.ghostService.global().readFileAsString('/', fileName))
      }

      if (!content) {
        throw new FatalError(`Modules configuration file "${fileName}" not found`)
      }

      // Variables substitution
      // TODO Check of a better way to handle path correction
      content = content.replace('%BOTPRESS_DIR%', process.PROJECT_LOCATION.replace(/\\/g, '/'))
      content = content.replace('"$isProduction"', process.IS_PRODUCTION ? 'true' : 'false')
      content = content.replace('"$isDevelopment"', process.IS_PRODUCTION ? 'false' : 'true')

      return <T>JSON.parse(content)
    } catch (e) {
      throw new FatalError(e, `Error reading configuration file "${fileName}"`)
    }
  }
}
