import { AdminServices } from 'admin/admin-router'
import { CustomAdminRouter } from 'admin/utils/customAdminRouter'
import { assertSuperAdmin } from 'core/security'
import _ from 'lodash'
import os from 'os'

import ChecklistRouter from './checklist/checklist-router'
import LanguagesRouter from './languages/languages-router'
import LicensingRouter from './licensing/licensing-router'
import ModulesRouter from './modules/modules-router'
import VersioningRouter from './versioning/router'

class ManagementRouter extends CustomAdminRouter {
  private versioningRouter: VersioningRouter
  private modulesRouter: ModulesRouter
  private checklistRouter: ChecklistRouter
  private languagesRouter: LanguagesRouter
  private licensingRouter: LicensingRouter
  private _rebootServer!: Function

  constructor(services: AdminServices) {
    super('Management', services)
    this.versioningRouter = new VersioningRouter(services)
    this.modulesRouter = new ModulesRouter(services)
    this.checklistRouter = new ChecklistRouter(services)
    this.languagesRouter = new LanguagesRouter(services)
    this.licensingRouter = new LicensingRouter(services)

    this.router.use('/languages', this.languagesRouter.router)
    this.router.use('/versioning', assertSuperAdmin, this.versioningRouter.router)
    this.router.use('/modules', assertSuperAdmin, this.modulesRouter.router)
    this.router.use('/checklist', assertSuperAdmin, this.checklistRouter.router)
    this.router.use('/licensing', this.licensingRouter.router)

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.setupRoutes()
  }

  async setupRoutes() {
    this.router.get(
      '/configHash',
      this.asyncMiddleware(async (req, res) => {
        res.send({
          initialHash: this.configProvider.initialConfigHash,
          currentHash: this.configProvider.currentConfigHash
        })
      })
    )

    this.router.post(
      '/features/enable/:featureId',
      this.asyncMiddleware(async (req, res) => {
        const { featureId } = req.params

        if (featureId === 'pro') {
          await this.configProvider.mergeBotpressConfig({ pro: { enabled: true } })
        } else if (featureId === 'monitoring') {
          await this.configProvider.mergeBotpressConfig({ pro: { monitoring: { enabled: true } } })
        } else if (featureId === 'alerting') {
          await this.configProvider.mergeBotpressConfig({ pro: { alerting: { enabled: true } } })
        }

        res.sendStatus(200)
      })
    )

    this.router.post(
      '/rebootServer',
      this.asyncMiddleware(async (req, res) => {
        const user = req.tokenUser!.email
        const config = await this.configProvider.getBotpressConfig()

        if (!config.allowServerReboot) {
          this.logger.warn(`User ${user} requested a server reboot, but the feature is disabled.`)
          return res.status(400).send('Rebooting the server is disabled in the botpress.config.json file')
        }

        this.logger.info(`User ${user} requested a server reboot for ${req.query.hostname}`)

        await this._rebootServer(req.query.hostname)
        res.sendStatus(200)
      })
    )

    this._rebootServer = await this.jobService.broadcast<void>(this.__local_rebootServer.bind(this))
  }

  private __local_rebootServer(hostname?: string) {
    if (!hostname || hostname === os.hostname()) {
      process.send!({ type: 'reboot_server' })
    }
  }
}

export default ManagementRouter
