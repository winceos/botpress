import * as sdk from 'botpress/sdk'
import { IO } from 'botpress/sdk'
import { ObjectCache } from 'common/object-cache'
import { UntrustedSandbox } from 'core/misc/code-sandbox'
import { printObject } from 'core/misc/print'
import { WorkspaceUserAttributes } from 'core/repositories/workspace_users'
import { inject, injectable, tagged } from 'inversify'
import _ from 'lodash'
import ms from 'ms'
import path from 'path'
import { NodeVM } from 'vm2'

import { GhostService } from '..'
import { clearRequireCache, requireAtPaths } from '../../modules/require'
import { TYPES } from '../../types'
import { filterDisabled } from '../action/utils'
import { VmRunner } from '../action/vm'
import { Incident } from 'botpress/sdk'

const debug = DEBUG('hooks')
const DEBOUNCE_DELAY = ms('2s')

interface HookOptions {
  timeout: number
}

const debugInstances: { [hookType: string]: IDebugInstance } = {}

export namespace Hooks {
  export class BaseHook {
    debug: IDebugInstance

    constructor(public folder: string, public args: any, public options: HookOptions = { timeout: 1000 }) {
      if (debugInstances[folder]) {
        this.debug = debugInstances[folder]
      } else {
        this.debug = debugInstances[folder] = debug.sub(folder)
      }
    }
  }

  export class AfterServerStart extends BaseHook {
    constructor(private bp: typeof sdk) {
      super('after_server_start', { bp })
    }
  }

  export class AfterBotMount extends BaseHook {
    constructor(private bp: typeof sdk, botId: string) {
      super('after_bot_mount', { bp, botId })
    }
  }

  export class AfterBotUnmount extends BaseHook {
    constructor(private bp: typeof sdk, botId) {
      super('after_bot_unmount', { bp, botId })
    }
  }

  export class BeforeIncomingMiddleware extends BaseHook {
    constructor(bp: typeof sdk, event: IO.Event) {
      super('before_incoming_middleware', { bp, event })
    }
  }

  export class AfterIncomingMiddleware extends BaseHook {
    constructor(bp: typeof sdk, event: IO.Event) {
      super('after_incoming_middleware', { bp, event })
    }
  }

  export class BeforeOutgoingMiddleware extends BaseHook {
    constructor(bp: typeof sdk, event: IO.Event) {
      super('before_outgoing_middleware', { bp, event })
    }
  }

  export class AfterEventProcessed extends BaseHook {
    constructor(bp: typeof sdk, event: IO.Event) {
      super('after_event_processed', { bp, event })
    }
  }

  export class BeforeSessionTimeout extends BaseHook {
    constructor(bp: typeof sdk, event: IO.Event) {
      super('before_session_timeout', { bp, event })
    }
  }

  export class BeforeSuggestionsElection extends BaseHook {
    constructor(bp: typeof sdk, sessionId: string, event: IO.Event, suggestions: IO.Suggestion[]) {
      super('before_suggestions_election', { bp, sessionId, event, suggestions })
    }
  }

  export class OnIncidentStatusChanged extends BaseHook {
    constructor(bp: typeof sdk, incident: Incident) {
      super('on_incident_status_changed', { bp, incident })
    }
  }

  export class BeforeBotImport extends BaseHook {
    constructor(bp: typeof sdk, botId: string, tmpFolder: string, hookResult: object) {
      super('before_bot_import', { bp, botId, tmpFolder, hookResult })
    }
  }

  export class OnBotError extends BaseHook {
    constructor(bp: typeof sdk, botId: string, events: sdk.LoggerEntry[]) {
      super('on_bot_error', { bp, botId, events })
    }
  }

  export class OnStageChangeRequest extends BaseHook {
    constructor(
      bp: typeof sdk,
      bot: sdk.BotConfig,
      users: WorkspaceUserAttributes[],
      pipeline: sdk.Pipeline,
      hookResult: any
    ) {
      super('on_stage_request', { bp, bot, users, pipeline, hookResult })
    }
  }

  export class AfterStageChanged extends BaseHook {
    constructor(
      bp: typeof sdk,
      previousBotConfig: sdk.BotConfig,
      bot: sdk.BotConfig,
      users: WorkspaceUserAttributes[],
      pipeline: sdk.Pipeline
    ) {
      super('after_stage_changed', { bp, previousBotConfig, bot, users, pipeline })
    }
  }
}

class HookScript {
  constructor(public path: string, public filename: string, public code: string, public botId?: string) {}
}

@injectable()
export class HookService {
  private _scriptsCache: Map<string, HookScript[]> = new Map()
  private _invalidateDebounce

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'HookService')
    private logger: sdk.Logger,
    @inject(TYPES.GhostService) private ghost: GhostService,
    @inject(TYPES.ObjectCache) private cache: ObjectCache
  ) {
    this._listenForCacheInvalidation()
    this._invalidateDebounce = _.debounce(this._invalidateRequire, DEBOUNCE_DELAY, { leading: true, trailing: false })
  }

  private _listenForCacheInvalidation() {
    this.cache.events.on('invalidation', key => {
      if (key.toLowerCase().indexOf(`/hooks/`) > -1) {
        // clear the cache if there's any file that has changed in the `hooks` folder
        this._scriptsCache.clear()
        this._invalidateDebounce()
      }
    })
  }

  private _invalidateRequire() {
    Object.keys(require.cache)
      .filter(r => r.match(/(\\|\/)hooks(\\|\/)/g))
      .map(file => delete require.cache[file])

    clearRequireCache()
  }

  async executeHook(hook: Hooks.BaseHook): Promise<void> {
    const botId = hook.args?.event?.botId || hook.args?.botId
    const scripts = await this.extractScripts(hook, botId)
    await Promise.mapSeries(_.orderBy(scripts, ['filename'], ['asc']), script => this.runScript(script, hook))
  }

  async disableHook(hookName: string, hookType: string, moduleName?: string): Promise<boolean> {
    try {
      const rootPath = moduleName ? `/hooks/${hookType}/${moduleName}/` : `/hooks/${hookType}/`
      await this.ghost.global().renameFile(rootPath, hookName + '.js', `.${hookName}.js`)
      return true
    } catch (error) {
      // if the hook was already disabled or not found
      return false
    }
  }

  async enableHook(hookName: string, hookType: string, moduleName?: string): Promise<boolean> {
    try {
      const rootPath = moduleName ? `/hooks/${hookType}/${moduleName}/` : `/hooks/${hookType}/`
      await this.ghost.global().renameFile(rootPath, `.${hookName}.js`, hookName + '.js')
      return true
    } catch (error) {
      // if the hook was already enabled (or not found)
      return false
    }
  }

  private async extractScripts(hook: Hooks.BaseHook, botId?: string): Promise<HookScript[]> {
    const scriptKey = botId ? `${hook.folder}_${botId}` : hook.folder

    if (this._scriptsCache.has(scriptKey)) {
      return this._scriptsCache.get(scriptKey)!
    }

    try {
      const globalHooks = filterDisabled(await this.ghost.global().directoryListing('hooks/' + hook.folder, '*.js'))
      const scripts = await Promise.map(globalHooks, async path => this._getHookScript(hook.folder, path))

      if (botId) {
        const botHooks = filterDisabled(await this.ghost.forBot(botId).directoryListing('hooks/' + hook.folder, '*.js'))
        scripts.push(...(await Promise.map(botHooks, async path => this._getHookScript(hook.folder, path, botId))))
      }

      this._scriptsCache.set(scriptKey, scripts)
      return scripts
    } catch (err) {
      this._scriptsCache.delete(scriptKey)
      return []
    }
  }

  private async _getHookScript(hookFolder: string, path: string, botId?: string) {
    let script: string
    if (!botId) {
      script = await this.ghost.global().readFileAsString('hooks/' + hookFolder, path)
    } else {
      script = await this.ghost.forBot(botId).readFileAsString('hooks/' + hookFolder, path)
    }

    const filename = path.replace(/^.*[\\\/]/, '')
    return new HookScript(path, filename, script, botId)
  }

  private _prepareRequire(fullPath: string, hookType: string) {
    const hookLocation = path.dirname(fullPath)

    let parts = path.relative(process.PROJECT_LOCATION, hookLocation).split(path.sep)
    parts = parts.slice(parts.indexOf(hookType) + 1) // We only keep the parts after /hooks/{type}/...

    const lookups: string[] = [hookLocation]

    if (parts[0] in process.LOADED_MODULES) {
      // the hook is in a directory by the same name as a module
      lookups.unshift(process.LOADED_MODULES[parts[0]])
    }

    return module => requireAtPaths(module, lookups, fullPath)
  }

  private async runScript(hookScript: HookScript, hook: Hooks.BaseHook) {
    const scope = hookScript.botId ? `bots/${hookScript.botId}` : 'global'
    const hookPath = `/data/${scope}/hooks/${hook.folder}/${hookScript.path}.js`

    const dirPath = path.resolve(path.join(process.PROJECT_LOCATION, hookPath))

    const _require = this._prepareRequire(dirPath, hook.folder)

    const botId = _.get(hook.args, 'event.botId')

    hook.debug.forBot(botId, 'before execute %o', { path: hookScript.path, botId, args: _.omit(hook.args, ['bp']) })
    process.BOTPRESS_EVENTS.emit(hook.folder, hook.args)

    if (process.DISABLE_GLOBAL_SANDBOX) {
      await this.runWithoutVm(hookScript, hook, botId, _require)
    } else {
      await this.runInVm(hookScript, hook, botId, _require)
    }

    hook.debug.forBot(botId, 'after execute')
  }

  private async runWithoutVm(hookScript: HookScript, hook: Hooks.BaseHook, botId: string, _require: Function) {
    const args = {
      ...hook.args,
      process: UntrustedSandbox.getSandboxProcessArgs(),
      printObject,
      require: _require
    }

    try {
      const fn = new Function(...Object.keys(args), hookScript.code)
      await fn(...Object.values(args))

      return
    } catch (err) {
      this.logScriptError(err, botId, hookScript.path, hook.folder)
    }
  }

  private async runInVm(hookScript: HookScript, hook: Hooks.BaseHook, botId: string, _require: Function) {
    const modRequire = new Proxy(
      {},
      {
        get: (_obj, prop) => _require(prop)
      }
    )

    const vm = new NodeVM({
      wrapper: 'none',
      console: 'inherit',
      sandbox: {
        ...hook.args,
        process: UntrustedSandbox.getSandboxProcessArgs(),
        printObject
      },
      timeout: hook.options.timeout,
      require: {
        external: true,
        mock: modRequire
      }
    })

    const vmRunner = new VmRunner()

    await vmRunner.runInVm(vm, hookScript.code, hookScript.path).catch(err => {
      this.logScriptError(err, botId, hookScript.path, hook.folder)
    })
  }

  private logScriptError(err, botId, path, folder) {
    const message = `An error occurred on "${path}" on "${folder}". ${err}`
    if (botId) {
      this.logger
        .forBot(botId)
        .attachError(err)
        .error(message)
    } else {
      this.logger.attachError(err).error(message)
    }
  }
}
