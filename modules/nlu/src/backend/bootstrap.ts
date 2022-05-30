import * as sdk from 'botpress/sdk'

import { makeNLUPassword } from 'common/nlu-token'
import _ from 'lodash'

import url from 'url'
import { Config, LanguageSource } from '../config'

import { getWebsocket } from './api'
import { ScopedServicesFactory } from './application/bot-factory'
import { BotService } from './application/bot-service'
import { DistributedTrainingQueue } from './application/distributed-training-queue'
import { NonBlockingNluApplication } from './application/non-blocking-app'
import { ScopedDefinitionsRepository } from './application/scoped/infrastructure/definitions-repository'
import { TrainingRepository } from './application/training-repo'
import { BotDefinition } from './application/typings'
import { NLUClientNoProxy } from './no-proxy-client'
import { StanEngine } from './stan'

export const isLocalHost = (endpoint: string) => {
  const { hostname } = new url.URL(endpoint)
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)
}

const getNLUServerConfig = (config: Config['nluServer']): LanguageSource & { isLocal: boolean } => {
  if (config.autoStart) {
    return {
      endpoint: `http://localhost:${process.NLU_PORT}`,
      authToken: makeNLUPassword(),
      isLocal: true
    }
  }

  const { endpoint, authToken } = config
  return {
    endpoint,
    authToken,
    isLocal: isLocalHost(endpoint)
  }
}

export async function bootStrap(bp: typeof sdk): Promise<NonBlockingNluApplication> {
  const globalConfig: Config = await bp.config.getModuleConfig('nlu')
  const { maxTrainingPerInstance, queueTrainingOnBotMount, legacyElection } = globalConfig

  if (legacyElection) {
    bp.logger.warn(
      'You are still using legacy election which is deprecated. Set { legacyElection: false } in your global nlu config to use the new election pipeline.'
    )
  }

  const nluServerConnectionInfo = getNLUServerConfig(globalConfig.nluServer)
  const stanClient = new NLUClientNoProxy(nluServerConnectionInfo)
  const engine = new StanEngine(stanClient, '') // No need for password as Stan is protected by an auth token

  const socket = getWebsocket(bp)

  const botService = new BotService()

  const makeDefRepo = (bot: BotDefinition) => new ScopedDefinitionsRepository(bot, bp)

  const servicesFactory = new ScopedServicesFactory(nluServerConnectionInfo, bp.logger, makeDefRepo)

  const trainRepo = new TrainingRepository(bp.database)
  const trainingQueue = new DistributedTrainingQueue(trainRepo, bp.logger, botService, bp.distributed, socket, {
    maxTraining: maxTrainingPerInstance
  })
  await trainingQueue.initialize()
  const application = new NonBlockingNluApplication(
    trainingQueue,
    engine,
    servicesFactory,
    botService,
    queueTrainingOnBotMount
  )

  // don't block entire server startup
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  application.initialize()

  return application
}
