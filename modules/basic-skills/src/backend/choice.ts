import * as sdk from 'botpress/sdk'
import _ from 'lodash'
import yn from 'yn'

const setup = async bp => {
  const router = bp.http.createRouterForBot('basic-skills')

  router.get('/choice/config', async (req, res) => {
    const config = await bp.config.getModuleConfigForBot('basic-skills', req.params.botId)
    res.send(_.pick(config, ['defaultContentElement', 'defaultContentRenderer', 'defaultMaxAttempts', 'matchNumbers']))
  })

  const config = await bp.config.getModuleConfig('basic-skills')

  const checkCategoryAvailable = async () => {
    const categories = await bp.cms.getAllContentTypes().map(c => c.id)

    if (!categories.includes(config.defaultContentElement)) {
      bp.logger.warn(`Configured to use Content Element "${config.defaultContentElement}", but it was not found.`)

      if (config.defaultContentElement === 'builtin_single-choice') {
        bp.logger.warn(`You should probably install (and use) the @botpress/builtins
  module OR change the "defaultContentElement" in this module's configuration to use your own content element.`)
      }

      return
    }
  }

  if (!config.disableIntegrityCheck) {
    setTimeout(checkCategoryAvailable, 3000)
  }
}

const generateFlow = async (data: any, metadata: sdk.FlowGeneratorMetadata): Promise<sdk.FlowGenerationResult> => {
  const { randomId } = data
  const hardRetryLimit = 10
  const nbMaxRetries = Math.min(Number(data.config.nbMaxRetries), hardRetryLimit)
  const repeatQuestion = yn(data.config.repeatChoicesOnInvalid)

  const sorrySteps = []

  if (data.invalidContentId && data.invalidContentId.length >= 3) {
    sorrySteps.push({
      type: sdk.NodeActionType.RenderElement,
      name: `#!${data.invalidContentId}`
    })
  }

  if (repeatQuestion) {
    sorrySteps.push({
      type: sdk.NodeActionType.RenderElement,
      name: `#!${data.contentId}`,
      args: { skill: 'choice' }
    })
  }

  const nodes: sdk.SkillFlowNode[] = [
    {
      name: 'entry',
      onEnter: [
        {
          type: sdk.NodeActionType.RenderElement,
          name: `#!${data.contentId}`,
          args: { skill: 'choice' }
        }
      ],
      next: [{ condition: 'true', node: 'parse' }]
    },
    {
      name: 'parse',
      onReceive: [
        {
          type: sdk.NodeActionType.RunAction,
          name: 'basic-skills/choice_parse_answer',
          args: { ...data, randomId }
        }
      ],
      next: [
        { condition: `temp['skill-choice-valid-${randomId}'] === true`, node: '#' },
        { condition: 'true', node: 'invalid' }
      ],
      triggers: [{ conditions: [{ id: 'always' }] }]
    },
    {
      name: 'invalid',
      onEnter: [
        {
          type: sdk.NodeActionType.RunAction,
          name: 'basic-skills/choice_invalid_answer',
          args: { randomId }
        }
      ],
      next: [
        {
          condition: `Number(temp['skill-choice-invalid-count-${randomId}']) > Number(${nbMaxRetries})`,
          node: '#'
        },
        { condition: 'true', node: 'sorry' }
      ]
    },
    {
      name: 'sorry',
      onEnter: sorrySteps,
      next: [{ condition: 'true', node: 'parse' }]
    }
  ]

  return {
    transitions: createTransitions(data, randomId),
    flow: {
      nodes: nodes,
      catchAll: {
        next: []
      }
    }
  }
}

const createTransitions = (data, randomId) => {
  const transitions: sdk.NodeTransition[] = Object.keys(data.keywords).map(choice => {
    const choiceShort = choice.length > 8 ? choice.substr(0, 7) + '...' : choice

    return {
      caption: `User picked [${choiceShort}]`,
      condition: `temp['skill-choice-ret-${randomId}'] == "${choice}"`,
      node: ''
    }
  })

  transitions.push({
    caption: 'On failure',
    condition: 'true',
    node: ''
  })

  return transitions
}

export default { generateFlow, setup }
