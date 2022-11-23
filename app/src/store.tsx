import { State as BifoldState, mergeReducers, reducer as bifoldReducer, defaultState } from 'aries-bifold'
import { Config } from 'react-native-config'

interface IASEnvironment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
}
interface Developer {
  environment: IASEnvironment
}

export interface BCState extends BifoldState {
  developer: Developer
}

enum DeveloperDispatchAction {
  UPDATE_ENVIRONMENT = 'developer/updateEnvironment',
}

export type BCDispatchAction = DeveloperDispatchAction

export const BCDispatchAction = {
  ...DeveloperDispatchAction,
}

interface BCReducerAction {
  type: BCDispatchAction
  payload?: Array<any>
}

const developerState: Developer = {
  environment: {
    name: 'Test',
    iasAgentInviteUrl: Config.IAS_AGENT_INVITE_URL,
    iasPortalUrl: Config.IAS_PORTAL_URL,
  },
}

export const initialState: BCState = { ...defaultState, developer: developerState }

const bcReducer = (state: BCState, action: BCReducerAction): BCState => {
  switch (action.type) {
    case DeveloperDispatchAction.UPDATE_ENVIRONMENT: {
      const environment: IASEnvironment = (action?.payload || []).pop()
      const developer = { ...state.developer, environment }
      return { ...state, developer }
    }
    default:
      return state
  }
}

// @ts-ignore
export const reducer = mergeReducers(bifoldReducer, bcReducer)
