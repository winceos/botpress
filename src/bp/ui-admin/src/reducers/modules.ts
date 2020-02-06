import api from '../api'

export const FETCH_MODULES_RECEIVED = 'bots/FETCH_MODULES_RECEIVED'

export interface ModulesState {
  modules: []
}
const initialState: ModulesState = { modules: [] }

export default (state = initialState, action): ModulesState => {
  switch (action.type) {
    case FETCH_MODULES_RECEIVED:
      return {
        ...state,
        modules: action.modules
      }

    default:
      return state
  }
}

export const fetchModules = () => {
  return async dispatch => {
    const { data } = await api.getSecured().get('/modules')
    dispatch({
      type: FETCH_MODULES_RECEIVED,
      modules: data
    })
  }
}
