import { handleActions } from 'redux-actions'

import { elementPropertiesReceived } from '~/actions'

const defaultState = []

const reducer = handleActions(
  {
    [elementPropertiesReceived]: (state, { payload }) => {
      return { ...state, selectedItem: payload }
    }
  },
  defaultState
)

export default reducer
