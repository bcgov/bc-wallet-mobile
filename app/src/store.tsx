import {
  State as BifoldState,
  mergeReducers,
  reducer as bifoldReducer,
  defaultState,
  ReducerAction,
  LocalStorageKeys,
} from '@hyperledger/aries-bifold-core'
import { Preferences } from '@hyperledger/aries-bifold-core/lib/typescript/App/types/state'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Config from 'react-native-config'

export interface IASEnvironment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
  attestationInviteUrl: string
}
export interface Developer {
  environment: IASEnvironment
  remoteLoggingEnabled: boolean
}

export interface AttestationAuthentification {
  id: string
  type: string
  createdAt: Date
  isDismissed: boolean
  isSeenOnHome: boolean
}

export interface QCPreferences extends Preferences {
  useForcedAppUpdate?: boolean
}

export interface BCState extends BifoldState {
  developer: Developer
  attestationAuthentification: AttestationAuthentification
  preferences: QCPreferences
  notificationsTempDeletedIds: string[]
}

enum DeveloperDispatchAction {
  UPDATE_ENVIRONMENT = 'developer/updateEnvironment',
}

enum AttestationAuthentificationDispatchAction {
  ATTESTATION_AUTHENTIFICATION_DISMISS = 'attestationAuthentification/attestationAuthentificationDismiss',
  ATTESTATION_AUTHENTIFICATION_SEEN_ON_HOME = 'attestationAuthentification/attestationAuthentificationSeenOnHome',
}

enum NotificationsTemporarilyDeletedDispatchAction {
  NOTIFICATIONS_TEMPORARILY_DELETED_IDS = 'notifications/temporarilyDeletedIds',
}

export enum PreferencesQCDispatchAction {
  USE_APP_FORCED_UPDATE = 'preferences/appForcedUpdate',
}

export type BCDispatchAction =
  | DeveloperDispatchAction
  | AttestationAuthentificationDispatchAction
  | PreferencesQCDispatchAction
  | NotificationsTemporarilyDeletedDispatchAction

export const BCDispatchAction = {
  ...DeveloperDispatchAction,
  ...AttestationAuthentificationDispatchAction,
  ...PreferencesQCDispatchAction,
  ...NotificationsTemporarilyDeletedDispatchAction,
}

export const iasEnvironments: Array<IASEnvironment> = [
  {
    name: 'MCN',
    iasAgentInviteUrl: Config.MEDIATOR_URL ?? '',
    iasPortalUrl: '',
    attestationInviteUrl: '',
  },
  {
    name: 'CQEN',
    iasAgentInviteUrl: Config.CQEN_MEDIATOR_URL ?? '',
    iasPortalUrl: '',
    attestationInviteUrl: '',
  },
]

const developerState: Developer = {
  environment: iasEnvironments[0],
  remoteLoggingEnabled: false,
}

export enum BCLocalStorageKeys {
  AttestationAuthentification = 'AttestationAuthentification',
  Environment = 'Environment',
  GenesisTransactions = 'GenesisTransactions',
  NotificationsTemporarilyDeleted = 'NotificationsTemporarilyDeleted',
}

const getInitialAttestationAuthentification = async (): Promise<AttestationAuthentification> => {
  const attestationAuthentificationString = await AsyncStorage.getItem(BCLocalStorageKeys.AttestationAuthentification)
  let attestationAuthentification = {}
  if (attestationAuthentificationString) {
    attestationAuthentification = JSON.parse(attestationAuthentificationString) as AttestationAuthentification
  } else {
    attestationAuthentification = {
      id: 'custom',
      type: 'CustomNotification',
      createdAt: new Date(),
      isDismissed: false,
      seenOnHome: false,
    }
    AsyncStorage.setItem(BCLocalStorageKeys.AttestationAuthentification, JSON.stringify(attestationAuthentification))
  }

  return attestationAuthentification as AttestationAuthentification
}

export const getInitialState = async (): Promise<BCState> => {
  const attestationAuthentification = await getInitialAttestationAuthentification()
  return {
    ...defaultState,
    developer: developerState,
    attestationAuthentification,
    preferences: {
      ...defaultState.preferences,
      useForcedAppUpdate: false,
    },
    notificationsTempDeletedIds: [],
  }
}

const bcReducer = (state: BCState, action: ReducerAction<BCDispatchAction>): BCState => {
  switch (action.type) {
    case DeveloperDispatchAction.UPDATE_ENVIRONMENT: {
      const environment: IASEnvironment = (action?.payload || []).pop()
      const developer = { ...state.developer, environment }

      // Persist IAS environment between app restarts
      AsyncStorage.setItem(BCLocalStorageKeys.Environment, JSON.stringify(developer.environment))
      return { ...state, developer }
    }
    case AttestationAuthentificationDispatchAction.ATTESTATION_AUTHENTIFICATION_DISMISS: {
      const { isDismissed } = (action?.payload || []).pop()
      const attestationAuthentification = { ...state.attestationAuthentification, isDismissed: isDismissed }

      const newState = { ...state, attestationAuthentification }

      // save to storage so notification doesn't reapper on app restart
      AsyncStorage.setItem(
        BCLocalStorageKeys.AttestationAuthentification,
        JSON.stringify(newState.attestationAuthentification)
      )
      return newState
    }
    case AttestationAuthentificationDispatchAction.ATTESTATION_AUTHENTIFICATION_SEEN_ON_HOME: {
      const { isSeenOnHome } = (action?.payload || []).pop()
      const attestationAuthentification = { ...state.attestationAuthentification, isSeenOnHome: isSeenOnHome }

      const newState = { ...state, attestationAuthentification }
      // save to storage so notification doesn't reapper on app restart
      AsyncStorage.setItem(BCLocalStorageKeys.AttestationAuthentification, JSON.stringify(attestationAuthentification))
      return newState
    }
    case NotificationsTemporarilyDeletedDispatchAction.NOTIFICATIONS_TEMPORARILY_DELETED_IDS: {
      const ids: string[] = action?.payload || []
      const newState = { ...state, notificationsTempDeletedIds: ids }
      AsyncStorage.setItem(BCLocalStorageKeys.NotificationsTemporarilyDeleted, JSON.stringify(ids))
      return newState
    }
    case PreferencesQCDispatchAction.USE_APP_FORCED_UPDATE: {
      const useForcedAppUpdate: boolean = (action?.payload || []).pop()
      const preferences = { ...state.preferences, useForcedAppUpdate: useForcedAppUpdate }

      const newState = { ...state, preferences }
      AsyncStorage.setItem(LocalStorageKeys.Preferences, JSON.stringify(preferences))
      return newState
    }
    default:
      return state
  }
}

// @ts-ignore
export const reducer = mergeReducers(bifoldReducer, bcReducer)
