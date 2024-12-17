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

export interface ActivityState {
  [id: string]: {
    isRead?: boolean
    isTempDeleted: boolean
  }
}

export interface QCPreferences extends Preferences {
  useForcedAppUpdate?: boolean
}

export interface BCState extends BifoldState {
  developer: Developer
  attestationAuthentification: AttestationAuthentification
  preferences: QCPreferences
  activities: ActivityState
}

enum DeveloperDispatchAction {
  UPDATE_ENVIRONMENT = 'developer/updateEnvironment',
}

enum AttestationAuthentificationDispatchAction {
  ATTESTATION_AUTHENTIFICATION_DISMISS = 'attestationAuthentification/attestationAuthentificationDismiss',
  ATTESTATION_AUTHENTIFICATION_SEEN_ON_HOME = 'attestationAuthentification/attestationAuthentificationSeenOnHome',
}

enum ActivityDispatchAction {
  NOTIFICATIONS_UPDATED = 'activity/notificationsUpdated',
  ACTIVITY_MULTIPLE_DELETED = 'activity/activitiesMultipleDeleted',
  ACTIVITY_TEMPORARILY_DELETED_IDS = 'activity/activitiesTemporarilyDeletedIds',
}

export enum PreferencesQCDispatchAction {
  USE_APP_FORCED_UPDATE = 'preferences/appForcedUpdate',
}

export type BCDispatchAction =
  | DeveloperDispatchAction
  | AttestationAuthentificationDispatchAction
  | PreferencesQCDispatchAction
  | ActivityDispatchAction

export const BCDispatchAction = {
  ...DeveloperDispatchAction,
  ...AttestationAuthentificationDispatchAction,
  ...PreferencesQCDispatchAction,
  ...ActivityDispatchAction,
}

export const iasEnvironments: Array<IASEnvironment> = [
  {
    name: 'MCN',
    iasAgentInviteUrl: Config.MEDIATOR_URL ?? '',
    iasPortalUrl: '',
  },
  {
    name: 'CQEN',
    iasAgentInviteUrl: Config.CQEN_MEDIATOR_URL ?? '',
    iasPortalUrl: '',
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
  Activities = 'Activities',
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

const getInitialActivitiesState = async (): Promise<ActivityState> => {
  const activitiesString = await AsyncStorage.getItem(BCLocalStorageKeys.Activities)
  let activities: ActivityState = {}
  if (activitiesString) {
    activities = JSON.parse(activitiesString) as ActivityState
  } else {
    AsyncStorage.setItem(BCLocalStorageKeys.Activities, JSON.stringify(activities))
  }

  return activities
}

export const getInitialState = async (): Promise<BCState> => {
  const attestationAuthentification = await getInitialAttestationAuthentification()
  const activities = await getInitialActivitiesState()
  return {
    ...defaultState,
    developer: developerState,
    attestationAuthentification,
    preferences: {
      ...defaultState.preferences,
      useForcedAppUpdate: false,
    },
    activities,
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
    case ActivityDispatchAction.ACTIVITY_TEMPORARILY_DELETED_IDS: {
      const activities: ActivityState = (action?.payload || []).pop()
      const newState = { ...state, activities: { ...state.activities, ...activities } }
      AsyncStorage.setItem(BCLocalStorageKeys.Activities, JSON.stringify(newState.activities))
      return newState
    }
    case ActivityDispatchAction.NOTIFICATIONS_UPDATED: {
      const activities: ActivityState = (action?.payload || []).pop()
      const newState = { ...state, activities: { ...state.activities, ...activities } }
      AsyncStorage.setItem(BCLocalStorageKeys.Activities, JSON.stringify(newState.activities))
      return newState
    }
    case ActivityDispatchAction.ACTIVITY_MULTIPLE_DELETED: {
      const activities: ActivityState = (action?.payload || []).pop()
      const activitiesUpdated = state.activities
      Object.keys(activities).forEach((key) => {
        if (activitiesUpdated[key]) {
          delete activitiesUpdated[key]
        }
      })
      const newState = { ...state, activities: activitiesUpdated }
      AsyncStorage.setItem(BCLocalStorageKeys.Activities, JSON.stringify(newState.activities))
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
