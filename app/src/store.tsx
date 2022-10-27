import { DefaultState, DispatchAction as BifoldDispatchAction, reducer as bifoldReducer } from 'aries-bifold'
import React, { createContext, Dispatch, useContext, useReducer } from 'react'

// import reducer, { ReducerAction } from './reducers/store'

interface BCState extends DefaultState {
  developer: any
}

enum DeveloperDispatchAction {
  CAKE = 'yes',
}

export type BCDispatchAction = BifoldDispatchAction & DeveloperDispatchAction

export interface ReducerAction {
  type: BCDispatchAction
  payload?: Array<any>
}

export const initialStateFactory = (): BCState => {
  return {
    developer: {
      idimUrl: 'https://example.com',
    },
    onboarding: {
      didAgreeToTerms: false,
      didCompleteTutorial: false,
      didCreatePIN: false,
      didConsiderBiometry: false,
    },
    authentication: {
      didAuthenticate: false,
    },
    loginAttempt: {
      loginAttempts: 0,
      servedPenalty: true,
    },
    lockout: {
      displayNotification: false,
    },
    privacy: {
      didShowCameraDisclosure: false,
    },
    preferences: {
      useBiometry: false,
    },
    credential: {
      revoked: new Set(),
      revokedMessageDismissed: new Set(),
    },
    error: null,
    loading: false,
  }
}

const initialState = initialStateFactory()

export const StoreContext = createContext<[BCState, Dispatch<ReducerAction>]>([
  initialState,
  () => {
    return
  },
])

type Reducer = <T extends DefaultState>(state: T, action: ReducerAction) => T

const bcReducer = (state: BCState, action: ReducerAction): BCState => {
  switch (action.type) {
    case DeveloperDispatchAction.CAKE:
      console.log('***************** CAKE ******************')
      return state

    default:
      return state
  }
}

const merge = (a: Reducer, b: Reducer): Reducer => {
  return <T extends DefaultState>(state: T, action: ReducerAction): T => {
    return a(b(state, action), action)
  }
}

// @ts-ignore
const reducer = merge(bifoldReducer, bcReducer)

export const StoreProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <StoreContext.Provider value={[state as BCState, dispatch]}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
