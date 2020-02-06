import * as sdk from 'botpress/sdk'
import crypto from 'crypto'
import _ from 'lodash'

import { TrainArtefacts, TrainInput, TrainOutput } from './training-pipeline'

export interface Model {
  hash: string
  languageCode: string
  startedAt: Date
  finishedAt: Date
  success: boolean
  data: {
    input: TrainInput
    output?: TrainOutput
    artefacts?: TrainArtefacts
  }
}

const MODELS_DIR = './models'

function makeFileName(hash: string, lang: string): string {
  return `${hash}.${lang}.model`
}

// we might want to make this language specific
export function computeModelHash(intents: any, entities: any): string {
  return crypto
    .createHash('md5')
    .update(JSON.stringify({ intents, entities }))
    .digest('hex')
}

export function serializeModel(model: Model): string {
  // TODO use messagePack here
  return JSON.stringify(_.omit(model, ['data.output', 'data.input.trainingSession']))
}

export function deserializeModel(str: string): Model {
  // TODO use messagePack here
  const model = JSON.parse(str) as Model
  model.data.artefacts.slots_model = Buffer.from(model.data.artefacts.slots_model)
  return model
}

export async function getModel(ghost: sdk.ScopedGhostService, hash: string, lang: string): Promise<Model | void> {
  const fname = makeFileName(hash, lang)
  if (await ghost.fileExists(MODELS_DIR, fname)) {
    const strMod = await ghost.readFileAsString(MODELS_DIR, fname)
    return deserializeModel(strMod)
  }
}

export async function getLatestModel(ghost: sdk.ScopedGhostService, lang: string): Promise<Model | void> {
  const endingPattern = makeFileName('*', lang)
  const availableModels = await ghost.directoryListing(MODELS_DIR, endingPattern)
  if (availableModels.length === 0) {
    return
  }

  const models = await Promise.map(availableModels, fname => getModel(ghost, fname.split('.')[0], lang))
  return _.head(_.orderBy(models, 'finishedAt', 'desc'))
}

export async function saveModel(ghost: sdk.ScopedGhostService, model: Model, hash: string): Promise<void> {
  const serialized = serializeModel(model)
  const fname = makeFileName(hash, model.languageCode)
  return ghost.upsertFile(MODELS_DIR, fname, serialized)
}
