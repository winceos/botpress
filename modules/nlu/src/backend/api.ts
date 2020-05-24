import * as sdk from 'botpress/sdk'
import Joi, { validate } from 'joi'
import _ from 'lodash'

import { isOn as isAutoTrainOn, set as setAutoTrain } from './autoTrain'
import { EntityDefCreateSchema } from './entities/validation'
import {
  deleteIntent,
  getIntent,
  getIntents,
  saveIntent,
  updateContextsFromTopics,
  updateIntent
} from './intents/intent-service'
import recommendations from './intents/recommendations'
import { IntentDefCreateSchema } from './intents/validation'
import { initializeLanguageProvider } from './module-lifecycle/on-server-started'
import { crossValidate } from './tools/cross-validation'
import { getTrainingSession } from './train-session-service'
import { NLUState } from './typings'

export const PredictSchema = Joi.object().keys({
  contexts: Joi.array()
    .items(Joi.string())
    .default(['global']),
  text: Joi.string().required()
})

export default async (bp: typeof sdk, state: NLUState) => {
  const router = bp.http.createRouterForBot('nlu')

  router.get('/health', async (req, res) => {
    // When the health is bad, we'll refresh the status in case it changed (eg: user added languages)
    if (!state.health.isEnabled) {
      await initializeLanguageProvider(bp, state)
    }
    res.send(state.health)
  })

  router.post('/cross-validation/:lang', async (req, res) => {
    const { botId, lang } = req.params
    const ghost = bp.ghost.forBot(botId)

    const intentDefs = await getIntents(ghost)
    const entityDefs = await state.nluByBot[botId].entityService.getCustomEntities()

    bp.logger.forBot(botId).info('Started cross validation')
    const xValidationRes = await crossValidate(botId, intentDefs, entityDefs, lang)
    bp.logger.forBot(botId).info('Finished cross validation', xValidationRes)

    res.send(xValidationRes)
  })

  router.get('/training/:language', async (req, res) => {
    const { language, botId } = req.params
    const session = await getTrainingSession(bp, botId, language)
    res.send(session)
  })

  router.post('/predict', async (req, res) => {
    const { botId } = req.params
    const { error, value } = PredictSchema.validate(req.body)
    if (error) {
      return res.status(400).send('Predict body is invalid')
    }
    if (!state.nluByBot[botId]) {
      return res.status(404).send(`Bot ${botId} doesn't exist`)
    }

    try {
      const nlu = await state.nluByBot[botId].engine.predict(value.text, value.contexts)
      res.send({ nlu })
    } catch (err) {
      res.status(500).send('Could not extract nlu data')
    }
  })

  router.get('/intents', async (req, res) => {
    const { botId } = req.params
    const ghost = bp.ghost.forBot(botId)
    const intentDefs = await getIntents(ghost)
    res.send(intentDefs)
  })

  router.get('/intents/:intent', async (req, res) => {
    const { botId, intent } = req.params
    const ghost = bp.ghost.forBot(botId)
    const intentDef = await getIntent(ghost, intent)
    res.send(intentDef)
  })

  router.post('/intents/:intent/delete', async (req, res) => {
    const { botId, intent } = req.params
    const ghost = bp.ghost.forBot(botId)
    try {
      await deleteIntent(ghost, intent)
      res.sendStatus(204)
    } catch (err) {
      bp.logger
        .forBot(botId)
        .attachError(err)
        .error('Could not delete intent')
      res.status(400).send(err.message)
    }
  })

  router.post('/intents', async (req, res) => {
    const { botId } = req.params
    const ghost = bp.ghost.forBot(botId)
    try {
      const intentDef = await validate(req.body, IntentDefCreateSchema, {
        stripUnknown: true
      })

      await saveIntent(ghost, intentDef, state.nluByBot[botId].entityService)

      res.sendStatus(200)
    } catch (err) {
      bp.logger
        .forBot(botId)
        .attachError(err)
        .warn('Cannot create intent')
      res.status(400).send(err.message)
    }
  })

  router.post('/intents/:intentName', async (req, res) => {
    const { botId, intentName } = req.params
    const ghost = bp.ghost.forBot(botId)
    try {
      await updateIntent(ghost, intentName, req.body, state.nluByBot[botId].entityService)
      res.sendStatus(200)
    } catch (err) {
      bp.logger
        .forBot(botId)
        .attachError(err)
        .error('Could not update intent')
      res.sendStatus(400)
    }
  })

  router.post('/condition/intentChanged', async (req, res) => {
    const { botId } = req.params
    const { action } = req.body
    const condition = req.body.condition as sdk.DecisionTriggerCondition

    if (action === 'delete' || action === 'create') {
      try {
        const ghost = bp.ghost.forBot(botId)

        await updateContextsFromTopics(ghost, state.nluByBot[botId].entityService, [condition.params.intentName])
        return res.sendStatus(200)
      } catch (err) {
        return res.status(400).send(err.message)
      }
    }

    res.sendStatus(200)
  })

  router.post('/sync/intents/topics', async (req, res) => {
    const { botId } = req.params
    const { intentNames } = req.body
    const ghost = bp.ghost.forBot(botId)

    try {
      await updateContextsFromTopics(ghost, state.nluByBot[botId].entityService, intentNames)
      res.sendStatus(200)
    } catch (err) {
      bp.logger
        .forBot(botId)
        .attachError(err)
        .error('Could not update intent topics')
      res.status(400).send(err.message)
    }
  })

  router.get('/contexts', async (req, res) => {
    const botId = req.params.botId
    const ghost = bp.ghost.forBot(botId)
    const intents = await getIntents(ghost)
    const ctxs = _.chain(intents)
      .flatMap(i => i.contexts)
      .uniq()
      .value()

    res.send(ctxs)
  })

  router.get('/entities', async (req, res) => {
    const { botId } = req.params
    const entities = await state.nluByBot[botId].entityService.getEntities()
    res.json(entities.map(x => ({ ...x, label: `${x.type}.${x.name}` })))
  })

  router.get('/entities/:entityName', async (req, res) => {
    const { botId, entityName } = req.params
    try {
      const entity = await state.nluByBot[botId].entityService.getEntity(entityName)
      res.send(entity)
    } catch (err) {
      bp.logger
        .forBot(botId)
        .attachError(err)
        .error(`Could not get entity ${entityName}`)
      res.send(400)
    }
  })

  router.post('/entities', async (req, res) => {
    const { botId } = req.params
    try {
      const entityDef = (await validate(req.body, EntityDefCreateSchema, {
        stripUnknown: true
      })) as sdk.NLU.EntityDefinition

      await state.nluByBot[botId].entityService.saveEntity(entityDef)

      res.sendStatus(200)
    } catch (err) {
      bp.logger
        .forBot(botId)
        .attachError(err)
        .warn('Cannot create entity')
      res.status(400).send(err.message)
    }
  })

  router.post('/entities/:id', async (req, res) => {
    const { botId, id } = req.params
    try {
      const entityDef = (await validate(req.body, EntityDefCreateSchema, {
        stripUnknown: true
      })) as sdk.NLU.EntityDefinition

      await state.nluByBot[botId].entityService.updateEntity(id, entityDef)
      res.sendStatus(200)
    } catch (err) {
      bp.logger
        .forBot(botId)
        .attachError(err)
        .error('Could not update entity')
      res.status(400).send(err.message)
    }
  })

  router.post('/entities/:id/delete', async (req, res) => {
    const { botId, id } = req.params
    try {
      await state.nluByBot[botId].entityService.deleteEntity(id)
      res.sendStatus(204)
    } catch (err) {
      bp.logger
        .forBot(botId)
        .attachError(err)
        .error('Could not delete entity')
      res.status(404).send(err.message)
    }
  })

  router.get('/train', async (req, res) => {
    try {
      const { botId } = req.params
      const isTraining = await state.nluByBot[botId].isTraining()
      res.send({ isTraining })
    } catch {
      res.sendStatus(500)
    }
  })

  router.post('/train', async (req, res) => {
    try {
      const { botId } = req.params
      await state.nluByBot[botId].trainOrLoad(true)
      res.sendStatus(200)
    } catch {
      res.sendStatus(500)
    }
  })

  router.post('/train/delete', async (req, res) => {
    try {
      const { botId } = req.params
      await state.nluByBot[botId].cancelTraining()
      res.sendStatus(200)
    } catch {
      res.sendStatus(500)
    }
  })

  router.get('/ml-recommendations', async (req, res) => {
    res.send(recommendations)
  })

  router.post('/autoTrain', async (req, res) => {
    const { botId } = req.params
    const { autoTrain } = req.body

    await setAutoTrain(bp, botId, autoTrain)

    res.sendStatus(200)
  })

  router.get('/autoTrain', async (req, res) => {
    const { botId } = req.params

    const isOn = await isAutoTrainOn(bp, botId)

    res.send({ isOn })
  })
}
