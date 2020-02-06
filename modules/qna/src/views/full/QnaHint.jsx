import { Icon } from '@blueprintjs/core'
import React from 'react'

import style from './style.scss'
import _ from 'lodash'

const QnaHint = props => {
  const utterances = props.questions.filter(q => q.length) || []

  const goodMLUtterances = props.mlRecommendations && props.mlRecommendations.goodUtterancesForML
  const minMLUtterances = props.mlRecommendations && props.mlRecommendations.minUtterancesForML

  const hint = createHint(utterances, goodMLUtterances, minMLUtterances)
  return hint ? (
    <p className={style.hint}>
      {!utterances.length && <Icon icon="warning-sign" />}
      {!!utterances.length && <Icon icon="symbol-diamond" />}
      {hint}
    </p>
  ) : null
}

const createHint = (utterances, goodMLUtterances, minMLUtterances) => {
  if (!minMLUtterances || !goodMLUtterances) {
    return null
  }

  const idealNumberOfUtt = goodMLUtterances

  if (!utterances.length) {
    return <span>This Q&A will be ignored, start adding questions to make it trainable.</span>
  }

  if (utterances.length && utterances.length < minMLUtterances) {
    const remaining = minMLUtterances - utterances.length
    return (
      <span>
        This Q&A will use <strong>exact match only</strong>. To enable machine learning, add at least{' '}
        <strong>
          {remaining} more question{remaining === 1 ? '' : 's'}
        </strong>
      </span>
    )
  }

  if (utterances.length >= minMLUtterances && utterances.length < idealNumberOfUtt) {
    const remaining = idealNumberOfUtt - utterances.length
    return (
      <span>
        Add{' '}
        <strong>
          {remaining} more question{remaining === 1 ? '' : 's'}
        </strong>{' '}
        to make your Q&A more resilient.
      </span>
    )
  }
}

export default QnaHint
