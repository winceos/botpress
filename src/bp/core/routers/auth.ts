import * as sdk from 'botpress/sdk'
import { AuthRule, ChatUserAuth, RequestWithUser, TokenUser, UserProfile } from 'common/typings'
import { ConfigProvider } from 'core/config/config-loader'
import { AuthStrategies } from 'core/services/auth-strategies'
import AuthService, { TOKEN_AUDIENCE } from 'core/services/auth/auth-service'
import StrategyBasic from 'core/services/auth/basic'
import { WorkspaceService } from 'core/services/workspace-service'
import { RequestHandler, Router } from 'express'
import Joi from 'joi'
import { AppLifecycle, AppLifecycleEvents } from 'lifecycle'
import _ from 'lodash'

import { CustomRouter } from './customRouter'
import { BadRequestError, NotFoundError } from './errors'
import { assertWorkspace, checkTokenHeader, success as sendSuccess, validateBodySchema } from './util'

export class AuthRouter extends CustomRouter {
  private checkTokenHeader!: RequestHandler

  constructor(
    private logger: sdk.Logger,
    private authService: AuthService,
    private configProvider: ConfigProvider,
    private workspaceService: WorkspaceService,
    private authStrategies: AuthStrategies
  ) {
    super('Auth', logger, Router({ mergeParams: true }))
    this.checkTokenHeader = checkTokenHeader(this.authService, TOKEN_AUDIENCE)

    // tslint:disable-next-line: no-floating-promises
    this.setupRoutes()
    // tslint:disable-next-line: no-floating-promises
    this.setupStrategies()
  }

  async setupStrategies() {
    // Waiting until the auth service was initialized (& config updated, if it's the first time)
    await AppLifecycle.waitFor(AppLifecycleEvents.SERVICES_READY)

    const strategyTypes = (await this.authService.getAllStrategies()).map(x => x.type)

    if (process.IS_PRO_ENABLED) {
      this.authStrategies.setup(this.router, strategyTypes)
    }

    if (strategyTypes.includes('basic')) {
      const basicStrategies = new StrategyBasic(this.logger, this.router, this.authService)
      basicStrategies.setup()

      this.authService.strategyBasic = basicStrategies
    }
  }

  async setupRoutes() {
    const router = this.router

    router.get(
      '/config',
      this.asyncMiddleware(async (req, res) => {
        return sendSuccess(res, 'Auth Config', await this.authService.getCollaboratorsConfig())
      })
    )

    router.get(
      '/ping',
      this.checkTokenHeader,
      this.asyncMiddleware(async (req, res) => {
        sendSuccess(res, 'Pong', { serverId: process.SERVER_ID })
      })
    )

    router.get(
      '/me/profile',
      this.checkTokenHeader,
      assertWorkspace,
      this.asyncMiddleware(async (req: RequestWithUser, res) => {
        const { email, strategy, isSuperAdmin } = req.tokenUser!
        const user = await this.authService.findUser(email, strategy)
        if (!user) {
          throw new NotFoundError(`User ${email || ''} not found`)
        }
        const { firstname, lastname, picture_url } = user.attributes
        const { type } = await this.authService.getStrategy(strategy)

        const permissions = await this.getUserPermissions(req.tokenUser!, req.workspace!)

        const userProfile: UserProfile = {
          firstname,
          lastname,
          email,
          picture_url,
          strategyType: type,
          strategy,
          isSuperAdmin,
          fullName: [firstname, lastname].filter(Boolean).join(' '),
          permissions
        }

        return sendSuccess(res, 'Retrieved profile successfully', userProfile)
      })
    )

    router.post(
      '/me/profile',
      this.checkTokenHeader,
      this.asyncMiddleware(async (req: RequestWithUser, res) => {
        const { email, strategy } = req.tokenUser!

        validateBodySchema(
          req,
          Joi.object().keys({
            firstname: Joi.string()
              .min(0)
              .max(35)
              .trim()
              .allow(''),
            lastname: Joi.string()
              .min(0)
              .max(35)
              .trim()
              .allow('')
          })
        )

        await this.authService.updateAttributes(email, strategy, {
          firstname: req.body.firstname,
          lastname: req.body.lastname
        })

        return sendSuccess(res, 'Updated profile successfully')
      })
    )

    router.get(
      '/me/workspaces',
      this.checkTokenHeader,
      this.asyncMiddleware(async (req: RequestWithUser, res) => {
        const { email, strategy, isSuperAdmin } = req.tokenUser!

        if (!isSuperAdmin) {
          return res.send(await this.workspaceService.getUserWorkspaces(email, strategy))
        }

        res.send(
          await Promise.map(this.workspaceService.getWorkspaces(), w => {
            return { email, strategy, workspace: w.id, role: w.adminRole, workspaceName: w.name }
          })
        )
      })
    )

    router.get(
      '/refresh',
      this.checkTokenHeader,
      this.asyncMiddleware(async (req: RequestWithUser, res) => {
        const config = await this.configProvider.getBotpressConfig()

        if (config.jwtToken && config.jwtToken.allowRefresh) {
          const newToken = await this.authService.refreshToken(req.tokenUser!)
          sendSuccess(res, 'Token refreshed successfully', { newToken })
        } else {
          const [, token] = req.headers.authorization!.split(' ')
          sendSuccess(res, 'Token not refreshed, sending back original', { newToken: token })
        }
      })
    )

    router.post(
      '/me/chatAuth',
      this.checkTokenHeader,
      this.asyncMiddleware(async (req: RequestWithUser, res) => {
        const { botId, sessionId, signature } = req.body as ChatUserAuth

        if (!botId || !sessionId || !signature) {
          throw new BadRequestError('Missing required fields')
        }

        await this.authService.authChatUser(req.body, req.tokenUser!)
        res.send(await this.workspaceService.getBotWorkspaceId(botId))
      })
    )
  }

  getUserPermissions = async (user: TokenUser, workspaceId: string): Promise<AuthRule[]> => {
    const { email, strategy, isSuperAdmin } = user
    const userRole = await this.workspaceService.getRoleForUser(email, strategy, workspaceId)

    if (isSuperAdmin) {
      return [{ res: '*', op: '+r+w' }]
    } else if (!userRole) {
      return [{ res: '*', op: '-r-w' }]
    } else {
      return userRole.rules
    }
  }

  sendSuccess = async (req, res) => {
    return sendSuccess(res)
  }
}
