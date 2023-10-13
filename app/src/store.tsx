import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  State as BifoldState,
  mergeReducers,
  reducer as bifoldReducer,
  defaultState,
  ReducerAction,
} from 'aries-bifold'
import Config from 'react-native-config'

export interface IASEnvironment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
}
interface Developer {
  environment: IASEnvironment
  attestationSupportEnabled: boolean
}

interface DismissPersonCredentialOffer {
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
    name: 'CQEN',
    iasAgentInviteUrl: Config.CQEN_MEDIATOR_URL ?? '',
    iasPortalUrl: '',
  },
  {
    name: 'MCN',
    iasAgentInviteUrl: Config.MCN_MEDIATOR_URL ?? '',
    iasPortalUrl: '',
  },
]

const developerState: Developer = {
  environment: iasEnvironments[0],
  attestationSupportEnabled: false,
}

const dismissPersonCredentialOfferState: DismissPersonCredentialOffer = {
  personCredentialOfferDismissed: false,
}

export enum BCLocalStorageKeys {
  PersonCredentialOfferDismissed = 'PersonCredentialOfferDismissed',
  Environment = 'Environment',
  Attestation = 'Attestation',
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
