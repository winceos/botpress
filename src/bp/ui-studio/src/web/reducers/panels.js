import { handleActions } from 'redux-actions'

import { selectedElementReceived } from '~/actions'

const defaultState = []

const reducer = handleActions(
  {
    [selectedElementReceived]: (state, { payload }) => {
      return { ...state, flowElementSelected: payload }
    }
  },
  defaultState
)

export default reducer
