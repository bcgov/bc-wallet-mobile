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
  attestationInviteUrl: string
}
export interface Developer {
  environment: IASEnvironment
  attestationSupportEnabled: boolean
  remoteLoggingEnabled: boolean
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
  ATTESTATION_SUPPORT = 'preferences/attestationSupport',
}

enum DismissPersonCredentialOfferDispatchAction {
  PERSON_CREDENTIAL_OFFER_DISMISSED = 'dismissPersonCredentialOffer/personCredentialOfferDismissed',
}

export type BCDispatchAction = DeveloperDispatchAction | DismissPersonCredentialOfferDispatchAction

export const BCDispatchAction = {
  ...DeveloperDispatchAction,
  ...DismissPersonCredentialOfferDispatchAction,
}

export const iasEnvironments: Array<IASEnvironment> = [
  {
    name: 'Production',
    iasAgentInviteUrl:
      'https://idim-agent.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZTZiY2EwNzQtYmNmNC00ZjQzLTgwMjYtNWNjZjhkN2M4OTQyIiwgImxhYmVsIjogIklESU0iLCAic2VydmljZUVuZHBvaW50IjogImh0dHBzOi8vaWRpbS1hZ2VudC5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyIsICJyZWNpcGllbnRLZXlzIjogWyJHeXJxY2NQR1FtV3JxWGZ6cWtRTUF2VlBycmRWYUdwRkgxOHNOWkUzdUtGIl19',
    iasPortalUrl: 'https://id.gov.bc.ca/issuer/v1/dids',
    attestationInviteUrl:
      'https://traction-acapy-prod.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICI0NjhkODE1ZC04OWY3LTQ4MGYtOGE1Yy1kNDllMjYyMjg4YTkiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiQ2pKbTkzVnRrcURSRTNROTVUeXpGN2lhNVRCdlJrVTU4MWNHZXZYU0FHaWoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LXByb2QuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSJ9',
  },
  {
    name: 'Development',
    iasAgentInviteUrl:
      'https://idim-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZDQ3NWM3ZjQtMTRjMy00NzdkLWI2NTMtY2Y5MDM4NDJmNGJjIiwgInJlY2lwaWVudEtleXMiOiBbIjJlSHBRRm9uTUVobXpvYWVFbUFMS1dxZHF5UldZZkE2TFF5akpKdGdiMldUIl0sICJsYWJlbCI6ICJJRElNIChEZXYpIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQtZGV2LmFwcHMuc2lsdmVyLmRldm9wcy5nb3YuYmMuY2EiLCAiaW1hZ2VVcmwiOiAiaHR0cHM6Ly9pZC5nb3YuYmMuY2Evc3RhdGljL0dvdi0yLjAvaW1hZ2VzL2Zhdmljb24uaWNvIn0=',
    iasPortalUrl: 'https://iddev.gov.bc.ca/issuer/v1/dids',
    attestationInviteUrl:
      'https://traction-acapy-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICI5NDc5MTk2Yi01NmY5LTRiYmItYTFmOC0xYTQzZGVlNzcyOGIiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiRXNiWkxWUERrSFNMTUtUS3BYZkZLQ3hqcGFvb2ZVa1VHNUIxdTQ5b0JYRlYiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIn0=',
  },
  {
    name: 'Test',
    iasAgentInviteUrl:
      'https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNmNjMjJiNTYtZmQwYy00Yjc4LWE3ZTQtYzYwYzJlODBlMDM0IiwgInJlY2lwaWVudEtleXMiOiBbIkNoSmJDTTVZSlMxb3hTQU1WNU1vY1J5cE1tUVp0eFFqcG9KWEZpTHZnMUM5Il0sICJsYWJlbCI6ICJJRElNIChTSVQpIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tc2l0LWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyJ9',
    iasPortalUrl: 'https://idsit.gov.bc.ca/issuer/v1/dids',
    attestationInviteUrl:
      'https://traction-acapy-test.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICJkYzc1YTExMy1iZGM5LTRmNGEtYjM1YS04NTIyNzQ1ZjdkOTEiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiOVRmYm45c2drYlZvdGNQaWpSYm1oeEVuZnVteWNvVVl0ZHJ5dWpiN242cHEiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LXRlc3QuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSJ9',
  },
]

const developerState: Developer = {
  environment: iasEnvironments[0],
  attestationSupportEnabled: false,
  remoteLoggingEnabled: false,
}

const dismissPersonCredentialOfferState: DismissPersonCredentialOffer = {
  personCredentialOfferDismissed: false,
}

export enum BCLocalStorageKeys {
  PersonCredentialOfferDismissed = 'PersonCredentialOfferDismissed',
  Environment = 'Environment',
  Attestation = 'Attestation',
  GenesisTransactions = 'GenesisTransactions',
}

export const initialState: BCState = {
  ...defaultState,
  developer: developerState,
  dismissPersonCredentialOffer: dismissPersonCredentialOfferState,
}

const bcReducer = (state: BCState, action: ReducerAction<BCDispatchAction>): BCState => {
  switch (action.type) {
    case BCDispatchAction.ATTESTATION_SUPPORT: {
      const choice = (action?.payload ?? []).pop() ?? false
      const developer = { ...state.developer, attestationSupportEnabled: choice }
      AsyncStorage.setItem(BCLocalStorageKeys.Attestation, JSON.stringify(developer.attestationSupportEnabled))

      return { ...state, developer }
    }
    case DeveloperDispatchAction.UPDATE_ENVIRONMENT: {
      const environment: IASEnvironment = (action?.payload || []).pop()
      const developer = { ...state.developer, environment }

      // Persist IAS environment between app restarts
      AsyncStorage.setItem(BCLocalStorageKeys.Environment, JSON.stringify(developer.environment))
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
