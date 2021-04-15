import { Logger } from 'botpress/sdk'
import { gaId } from 'common/stats'
import { HTTPServer } from 'core/app/server'
import { resolveAsset, resolveIndexPaths } from 'core/app/server_utils'
import { BotService } from 'core/bots'
import { GhostService } from 'core/bpfs'
import { CMSService } from 'core/cms'
import { BotpressConfig } from 'core/config'
import { ConfigProvider } from 'core/config/config-loader'
import { FlowService } from 'core/dialog'
import { LogsService } from 'core/logger'
import { MediaServiceProvider } from 'core/media'
import { NotificationsService } from 'core/notifications'
import { CustomRouter } from 'core/routers/customRouter'
import { AuthService, TOKEN_AUDIENCE, checkTokenHeader, needPermissions, checkBotVisibility } from 'core/security'
import { ActionServersService, ActionService } from 'core/user-code'
import { WorkspaceService } from 'core/users'
import express, { RequestHandler, Router } from 'express'
import rewrite from 'express-urlrewrite'
import _ from 'lodash'

import { ActionsRouter } from './actions/actions-router'
import { CMSRouter } from './cms/cms-router'
import { FlowsRouter } from './flows/flows-router'
import { LogsRouter } from './logs/logs-router'
import MediaRouter from './media/media-router'
import { NotificationsRouter } from './notifications/notifications-router'
import { TopicsRouter } from './topics/topics-router'
import { fixStudioMappingMw } from './utils/api-mapper'

export interface StudioServices {
  logger: Logger
  authService: AuthService
  workspaceService: WorkspaceService
  botService: BotService
  configProvider: ConfigProvider
  cmsService: CMSService
  mediaServiceProvider: MediaServiceProvider
  flowService: FlowService
  actionService: ActionService
  actionServersService: ActionServersService
  notificationService: NotificationsService
  logsService: LogsService
  bpfs: GhostService
}

export class StudioRouter extends CustomRouter {
  private checkTokenHeader: RequestHandler

  private botpressConfig?: BotpressConfig
  private cmsRouter: CMSRouter
  private mediaRouter: MediaRouter
  private actionsRouter: ActionsRouter
  private flowsRouter: FlowsRouter
  private logsRouter: LogsRouter
  private notificationsRouter: NotificationsRouter
  private topicsRouter: TopicsRouter

  constructor(
    logger: Logger,
    private authService: AuthService,
    private workspaceService: WorkspaceService,
    private botService: BotService,
    private configProvider: ConfigProvider,
    actionService: ActionService,
    cmsService: CMSService,
    flowService: FlowService,
    notificationService: NotificationsService,
    logsService: LogsService,
    bpfs: GhostService,
    mediaServiceProvider: MediaServiceProvider,
    actionServersService: ActionServersService,
    private httpServer: HTTPServer
  ) {
    super('Admin', logger, Router({ mergeParams: true }))
    this.checkTokenHeader = checkTokenHeader(this.authService, TOKEN_AUDIENCE)

    const studioServices: StudioServices = {
      logger,
      authService: this.authService,
      mediaServiceProvider,
      workspaceService,
      notificationService,
      actionService,
      flowService,
      botService,
      configProvider,
      logsService,
      bpfs,
      cmsService,
      actionServersService
    }

    this.cmsRouter = new CMSRouter(studioServices)

    this.actionsRouter = new ActionsRouter(studioServices)
    this.flowsRouter = new FlowsRouter(studioServices)
    this.logsRouter = new LogsRouter(studioServices)
    this.mediaRouter = new MediaRouter(studioServices, this.botpressConfig)
    this.notificationsRouter = new NotificationsRouter(studioServices)
    this.topicsRouter = new TopicsRouter(studioServices)
  }

  async setupRoutes(app: express.Express) {
    this.botpressConfig = await this.configProvider.getBotpressConfig()

    app.use(rewrite('/studio/:botId/*env.js', '/api/v1/studio/:botId/env.js'))

    // TODO: Temporary until studio routes are changed
    app.use('/api/v1/bots/:botId', fixStudioMappingMw, this.router)

    app.use('/api/v1/studio/:botId', this.router)

    this.router.use(checkBotVisibility(this.configProvider, this.checkTokenHeader))

    this.router.use('/actions', this.checkTokenHeader, this.actionsRouter.router)
    this.router.use('/cms', this.checkTokenHeader, this.cmsRouter.router)
    this.router.use('/flows', this.checkTokenHeader, this.flowsRouter.router)
    this.router.use('/logs', this.checkTokenHeader, this.logsRouter.router)
    this.router.use('/media', this.mediaRouter.router)
    this.router.use('/notifications', this.checkTokenHeader, this.notificationsRouter.router)
    this.router.use('/topics', this.checkTokenHeader, this.topicsRouter.router)

    this.setupUnauthenticatedRoutes(app)
    this.setupStaticRoutes(app)
  }

  setupUnauthenticatedRoutes(app) {
    /**
     * UNAUTHENTICATED ROUTES
     * Do not return sensitive information there. These must be accessible by unauthenticated users
     */
    this.router.get(
      '/env.js',
      this.asyncMiddleware(async (req, res) => {
        const { botId } = req.params

        const bot = await this.botService.findBotById(botId)
        if (!bot) {
          return res.sendStatus(404)
        }

        const branding = await this.configProvider.getBrandingConfig('studio')
        const workspaceId = await this.workspaceService.getBotWorkspaceId(botId)
        const commonEnv = await this.httpServer.getCommonEnv()

        const totalEnv = `
          (function(window) {
              ${commonEnv}
              window.APP_VERSION = "${process.BOTPRESS_VERSION}";
              
              window.ANALYTICS_ID = "${gaId}";
              window.API_PATH = "${process.ROOT_PATH}/api/v1";
              window.BOT_API_PATH = "${process.ROOT_PATH}/api/v1/bots/${botId}";
              window.BOT_ID = "${botId}";
              window.BOT_NAME = "${bot.name}";
              window.BP_BASE_PATH = "${process.ROOT_PATH}/studio/${botId}";
              window.APP_VERSION = "${process.BOTPRESS_VERSION}";
              window.APP_NAME = "${branding.title}";
              window.APP_FAVICON = "${branding.favicon}";
              window.APP_CUSTOM_CSS = "${branding.customCss}";
              window.BOT_LOCKED = ${!!bot.locked};
              window.USE_ONEFLOW = ${!!bot['oneflow']};
              window.WORKSPACE_ID = "${workspaceId}";
              window.IS_BOT_MOUNTED = ${this.botService.isBotMounted(botId)};
            })(typeof window != 'undefined' ? window : {})
          `

        res.contentType('text/javascript')
        res.send(totalEnv)
      })
    )
  }

  setupStaticRoutes(app) {
    app.get('/studio', (req, res, next) => res.redirect('/admin'))

    app.use('/:app(studio)/:botId', express.static(resolveAsset('ui-studio/public'), { index: false }))
    app.use('/:app(studio)/:botId', resolveIndexPaths('ui-studio/public/index.html'))

    app.use('/:app(lite)/:botId?', express.static(resolveAsset('ui-studio/public/lite'), { index: false }))
    app.use('/:app(lite)/:botId?', resolveIndexPaths('ui-studio/public/lite/index.html'))

    app.use('/:app(lite)/:botId', express.static(resolveAsset('ui-studio/public'), { index: false }))
    app.use('/:app(lite)/:botId', resolveIndexPaths('ui-studio/public/index.html'))

    app.get(['/:app(studio)/:botId/*'], resolveIndexPaths('ui-studio/public/index.html'))
  }
}
