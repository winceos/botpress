import chalk from 'chalk'
import _ from 'lodash'
import path from 'path'

import center from '../core/logger/center'
// tslint:disable-next-line:ordered-imports
import rewire from '../sdk/rewire'
// tslint:disable-next-line:ordered-imports

global.rewire = rewire as any
import API, { APIOptions } from './api'
import { LangServerLogger } from './logger'
import LanguageService from './service'
import DownloadManager from './service/download-manager'

const debug = DEBUG('api')

export interface ArgV {
  port: number
  host: string
  limit: number
  limitWindow: string
  langDir?: string
  authToken?: string
  adminToken?: string
  metadataLocation: string
  offline: boolean
  dim: number
  domain: string
}

export default async function(options: ArgV) {
  options.langDir = options.langDir || path.join(process.APP_DATA_PATH, 'embeddings')

  debug('Language Server Options ', options)

  const logger = new LangServerLogger('Launcher')
  const langService = new LanguageService(options.dim, options.domain, options.langDir)
  const downloadManager = new DownloadManager(options.dim, options.domain, options.langDir, options.metadataLocation)

  const apiOptions: APIOptions = {
    host: options.host,
    port: options.port,
    authToken: options.authToken,
    limit: options.limit,
    limitWindow: options.limitWindow,
    adminToken: options.adminToken || ''
  }

  logger.info(chalk`========================================
{bold ${center(`Botpress Language Server`, 40)}}
{dim ${center(`OS ${process.distro}`, 40)}}
========================================`)

  if (options.authToken && options.authToken.length) {
    logger.info(`authToken: ${chalk.greenBright('enabled')} (only users with this token can query your server)`)
  } else {
    logger.info(`authToken: ${chalk.redBright('disabled')} (anyone can query your language server)`)
  }

  if (options.adminToken && options.adminToken.length) {
    logger.info(`adminToken: ${chalk.greenBright('enabled')} (only users using this token can manage the server)`)
  } else {
    logger.info(`adminToken: ${chalk.redBright('disabled')} (anyone can add, remove or change languages)`)
  }

  if (options.limit) {
    logger.info(
      `limit: ${chalk.greenBright('enabled')} allowing ${options.limit} requests/IP address in a ${
        options.limitWindow
      } timeframe `
    )
  } else {
    logger.info(`limit: ${chalk.redBright('disabled')} (no protection - anyone can query without limitation)`)
  }

  if (options.offline) {
    logger.info(
      `mode: ${chalk.redBright(
        'offline'
      )} (languages need to be downloaded manually from a machine with Internet access)`
    )
  } else {
    logger.info(`Mode: ${chalk.greenBright('online')} (languages will be downloaded from ${options.metadataLocation})`)
  }

  logger.info(`Serving ${options.dim} language dimensions from ${options.langDir}`)

  if (options.offline) {
    await Promise.all([API(apiOptions, langService), langService.initialize()])
  } else {
    await Promise.all([
      API(apiOptions, langService, downloadManager),
      downloadManager.initialize(),
      langService.initialize()
    ])
  }
}
