import { State as BifoldState, mergeReducers, reducer as bifoldReducer, defaultState } from 'aries-bifold'
import { Config } from 'react-native-config'

interface Developer {
  iasAgentInviteUrl: string
  iasPortalUrl: string
  iasInvitationID: string
}

export interface BCState extends BifoldState {
  developer: Developer
}

enum DeveloperDispatchAction {
  UPDATE_DEVELOPER_SETTINGS = 'developer/updateDeveloperSettings',
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
  iasAgentInviteUrl: Config.IAS_AGENT_INVITE_URL,
  iasPortalUrl: Config.IAS_PORTAL_URL,
  iasInvitationID: '',
}

export const initialState: BCState = { ...defaultState, developer: developerState }

const bcReducer = (state: BCState, action: BCReducerAction): BCState => {
  switch (action.type) {
    case DeveloperDispatchAction.UPDATE_DEVELOPER_SETTINGS: {
      const developer: Developer = (action?.payload || []).pop()
      return { ...state, developer }
    }
    default:
      return state
  }
}

// @ts-ignore
export const reducer = mergeReducers(bifoldReducer, bcReducer)
