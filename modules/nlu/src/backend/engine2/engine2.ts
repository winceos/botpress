import { MLToolkit, NLU } from 'botpress/sdk'
import _ from 'lodash'

import { isPatternValid } from '../tools/patterns-utils'
import { Engine2, ListEntity, Tools, TrainingSession } from '../typings'

import CRFExtractor2 from './crf-extractor2'
import { computeModelHash, Model } from './model-service'
import { Predict, PredictInput, Predictors, PredictOutput } from './predict-pipeline'
import { computeKmeans, ProcessIntents, Trainer, TrainInput, TrainOutput } from './training-pipeline'

const trainDebug = DEBUG('nlu').sub('training')

export default class E2 implements Engine2 {
  // NOTE: removed private in order to prevent important refactor (which will be done later)
  static tools: Tools
  private predictorsByLang: _.Dictionary<Predictors> = {}
  private modelsByLang: _.Dictionary<Model> = {}

  constructor(private defaultLanguage: string, private botId: string) {}

  static provideTools(tools: Tools) {
    E2.tools = tools
  }

  async train(
    intentDefs: NLU.IntentDefinition[],
    entityDefs: NLU.EntityDefinition[],
    languageCode: string,
    trainingSession?: TrainingSession
  ): Promise<Model> {
    trainDebug.forBot(this.botId, `Started ${languageCode} training`)

    const list_entities = entityDefs
      .filter(ent => ent.type === 'list')
      .map(e => {
        return {
          name: e.name,
          fuzzyTolerance: e.fuzzy,
          sensitive: e.sensitive,
          synonyms: _.chain(e.occurrences)
            .keyBy('name')
            .mapValues('synonyms')
            .value()
        } as ListEntity
      })

    const pattern_entities = entityDefs
      .filter(ent => ent.type === 'pattern' && isPatternValid(ent.pattern))
      .map(ent => ({
        name: ent.name,
        pattern: ent.pattern,
        examples: [], // TODO add this to entityDef
        matchCase: ent.matchCase,
        sensitive: ent.sensitive
      }))

    const contexts = _.chain(intentDefs)
      .flatMap(i => i.contexts)
      .uniq()
      .value()

    const input: TrainInput = {
      botId: this.botId,
      trainingSession,
      languageCode,
      list_entities,
      pattern_entities,
      contexts,
      intents: intentDefs
        .filter(x => !!x.utterances[languageCode])
        .map(x => ({
          name: x.name,
          contexts: x.contexts,
          utterances: x.utterances[languageCode],
          slot_definitions: x.slots
        }))
    }

    // Model should be build here, Trainer should not have any idea of how this is stored
    // Error handling should be done here
    const model = await Trainer(input, E2.tools)
    model.hash = computeModelHash(intentDefs, entityDefs)
    if (model.success) {
      trainingSession &&
        E2.tools.reportTrainingProgress(this.botId, 'Training complete', {
          ...trainingSession,
          progress: 1,
          status: 'done'
        })

      trainDebug.forBot(this.botId, `Successfully finished ${languageCode} training`)
      await this.loadModel(model)
    }

    return model
  }

  private modelAlreadyLoaded(model: Model) {
    return (
      this.predictorsByLang[model.languageCode] !== undefined &&
      this.modelsByLang[model.languageCode] !== undefined &&
      _.isEqual(this.modelsByLang[model.languageCode].data.input, model.data.input)
      // TODO compare hash instead (need a migration)
      // this.modelsByLang[model.languageCode].hash === model.hash
    )
  }

  async loadModels(models: Model[]) {
    // note the usage of mapSeries, possible race condition
    return Promise.mapSeries(models, model => this.loadModel(model))
  }

  async loadModel(model: Model) {
    if (this.modelAlreadyLoaded(model)) {
      return
    }
    // TODO if model or predictor not valid, throw and retry
    this.predictorsByLang[model.languageCode] = await this._makePredictors(model)
    this.modelsByLang[model.languageCode] = model
  }

  private async _makePredictors(model: Model): Promise<Predictors> {
    if (!model.data.output) {
      const intents = await ProcessIntents(
        model.data.input.intents,
        model.languageCode,
        model.data.artefacts.list_entities,
        E2.tools
      )
      model.data.output = { intents } as TrainOutput
    }

    const { input, output, artefacts } = model.data
    const tools = E2.tools

    if (_.flatMap(input.intents, i => i.utterances).length > 0) {
      const ctx_classifier = new tools.mlToolkit.SVM.Predictor(artefacts.ctx_model)
      const intent_classifier_per_ctx = _.toPairs(artefacts.intent_model_by_ctx).reduce(
        (c, [ctx, intentModel]) => ({ ...c, [ctx]: new tools.mlToolkit.SVM.Predictor(intentModel as string) }),
        {} as _.Dictionary<MLToolkit.SVM.Predictor>
      )
      const slot_tagger = new CRFExtractor2(tools.mlToolkit) // TODO change this for MLToolkit.CRF.Tagger
      slot_tagger.load(artefacts.slots_model)

      const kmeans = computeKmeans(output.intents, tools) // TODO load from artefacts when persisted

      return {
        ...artefacts,
        ctx_classifier,
        intent_classifier_per_ctx,
        slot_tagger,
        kmeans,
        pattern_entities: input.pattern_entities,
        intents: output.intents
      }
    } else {
      // we don't want to return undefined as extraction won't be triggered
      // we want to make it possible to extract entities without having any intents
      return { ...artefacts, intents: [], pattern_entities: input.pattern_entities } as Predictors
    }
  }

  async predict(sentence: string, includedContexts: string[]): Promise<PredictOutput> {
    const input: PredictInput = {
      defaultLanguage: this.defaultLanguage,
      sentence,
      includedContexts
    }

    // error handled a level higher
    return Predict(input, E2.tools, this.predictorsByLang)
  }
}
