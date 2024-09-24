import {
  State as BifoldState,
  mergeReducers,
  reducer as bifoldReducer,
  defaultState,
  ReducerAction,
} from '@hyperledger/aries-bifold-core'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface IASEnvironment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
}

export type RemoteDebuggingState = {
  enabledAt?: Date
  sessionId?: number
}
export interface Developer {
  environment: IASEnvironment
  remoteDebugging: RemoteDebuggingState
  enableProxy: boolean
}

export interface DismissPersonCredentialOffer {
  personCredentialOfferDismissed: boolean
}

export interface BCState extends BifoldState {
  developer: Developer
  dismissPersonCredentialOffer: DismissPersonCredentialOffer
}

enum DeveloperDispatchAction {
  UPDATE_ENVIRONMENT = 'developer/updateEnvironment',
  TOGGLE_PROXY = 'developer/toggleProxy',
}

enum DismissPersonCredentialOfferDispatchAction {
  PERSON_CREDENTIAL_OFFER_DISMISSED = 'dismissPersonCredentialOffer/personCredentialOfferDismissed',
}

enum RemoteDebuggingDispatchAction {
  REMOTE_DEBUGGING_STATUS_UPDATE = 'remoteDebugging/enable',
}

export type BCDispatchAction =
  | DeveloperDispatchAction
  | DismissPersonCredentialOfferDispatchAction
  | RemoteDebuggingDispatchAction

export const BCDispatchAction = {
  ...DeveloperDispatchAction,
  ...DismissPersonCredentialOfferDispatchAction,
  ...RemoteDebuggingDispatchAction,
}

export const iasEnvironments: Array<IASEnvironment> = [
  {
    name: 'Production',
    iasAgentInviteUrl:
      'https://idim-agent.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNWY2NTYzYWItNzEzYi00YjM5LWI5MTUtNjY2YjJjNDc4M2U2IiwgImxhYmVsIjogIlNlcnZpY2UgQkMiLCAicmVjaXBpZW50S2V5cyI6IFsiN2l2WVNuN3NocW8xSkZyYm1FRnVNQThMNDhaVnh2TnpwVkN6cERSTHE4UmoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSIsICJpbWFnZVVybCI6ICJodHRwczovL2lkLmdvdi5iYy5jYS9zdGF0aWMvR292LTIuMC9pbWFnZXMvZmF2aWNvbi5pY28ifQ==',
    iasPortalUrl: 'https://id.gov.bc.ca/issuer/v1/dids',
  },
  {
    name: 'Development',
    iasAgentInviteUrl:
      'https://idim-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiY2U1NWFiZDctNWRmYy00YjQ5LWExODYtOWUzMzQ1ZjEyZThkIiwgImxhYmVsIjogIlNlcnZpY2UgQkMgKERldikiLCAicmVjaXBpZW50S2V5cyI6IFsiM0I0bnlDMVg4R1E0M0NLczR4clVXOFdnbWE5MUpMem50cVVYdlo0UjQ4TXQiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQtZGV2LmFwcHMuc2lsdmVyLmRldm9wcy5nb3YuYmMuY2EiLCAiaW1hZ2VVcmwiOiAiaHR0cHM6Ly9pZC5nb3YuYmMuY2Evc3RhdGljL0dvdi0yLjAvaW1hZ2VzL2Zhdmljb24uaWNvIn0=',
    iasPortalUrl: 'https://iddev.gov.bc.ca/issuer/v1/dids',
  },
  {
    name: 'Test',
    iasAgentInviteUrl:
      'https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZDFkMDk5MDQtN2ZlOC00YzlkLTk4YjUtZmNmYmEwODkzZTAzIiwgImxhYmVsIjogIlNlcnZpY2UgQkMgKFNJVCkiLCAicmVjaXBpZW50S2V5cyI6IFsiNVgzblBoZkVIOU4zb05kcHdqdUdjM0ZhVzNQbmhiY05QemRGbzFzS010dEoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tc2l0LWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyJ9',
    iasPortalUrl: 'https://idsit.gov.bc.ca/issuer/v1/dids',
  },
]

const remoteDebuggingState: RemoteDebuggingState = {
  enabledAt: undefined,
  sessionId: undefined,
}

const developerState: Developer = {
  enableProxy: false,
  environment: iasEnvironments[0],
  remoteDebugging: remoteDebuggingState,
}

const dismissPersonCredentialOfferState: DismissPersonCredentialOffer = {
  personCredentialOfferDismissed: false,
}

export enum BCLocalStorageKeys {
  PersonCredentialOfferDismissed = 'PersonCredentialOfferDismissed',
  Environment = 'Environment',
  GenesisTransactions = 'GenesisTransactions',
  RemoteDebugging = 'RemoteDebugging',
  EnableProxy = 'EnableProxy',
}

export const initialState: BCState = {
  ...defaultState,
  preferences: { ...defaultState.preferences, useDataRetention: false, disableDataRetentionOption: true },
  developer: developerState,
  dismissPersonCredentialOffer: dismissPersonCredentialOfferState,
}

const bcReducer = (state: BCState, action: ReducerAction<BCDispatchAction>): BCState => {
  switch (action.type) {
    case RemoteDebuggingDispatchAction.REMOTE_DEBUGGING_STATUS_UPDATE: {
      const { enabledAt, sessionId } = (action.payload || []).pop()
      const developer = { ...state.developer, remoteDebugging: { enabledAt, sessionId } }
      const newState = { ...state, developer }

      if (enabledAt) {
        AsyncStorage.setItem(BCLocalStorageKeys.RemoteDebugging, JSON.stringify(developer.remoteDebugging))
      } else {
        AsyncStorage.removeItem(BCLocalStorageKeys.RemoteDebugging)
      }

      return newState
    }
    case DeveloperDispatchAction.UPDATE_ENVIRONMENT: {
      const environment: IASEnvironment = (action?.payload || []).pop()
      const developer = { ...state.developer, environment }

      // Persist IAS environment between app restarts
      AsyncStorage.setItem(BCLocalStorageKeys.Environment, JSON.stringify(developer.environment))
      return { ...state, developer }
    }
    case DeveloperDispatchAction.TOGGLE_PROXY: {
      const enableProxy: boolean = (action?.payload || []).pop() || false
      const developer = { ...state.developer, enableProxy }

      AsyncStorage.setItem(BCLocalStorageKeys.EnableProxy, JSON.stringify(developer.enableProxy))
      return { ...state, developer }
    }
    case DismissPersonCredentialOfferDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED: {
      const { personCredentialOfferDismissed } = (action?.payload || []).pop()
      const dismissPersonCredentialOffer = { ...state.dismissPersonCredentialOffer, personCredentialOfferDismissed }
      const newState = { ...state, dismissPersonCredentialOffer }

      // save to storage so notification doesn't reapper on app restart
      AsyncStorage.setItem(
        BCLocalStorageKeys.PersonCredentialOfferDismissed,
        JSON.stringify(newState.dismissPersonCredentialOffer)
      )
      return newState
    }
    default:
      return state
  }
}

// @ts-ignore
export const reducer = mergeReducers(bifoldReducer, bcReducer)
