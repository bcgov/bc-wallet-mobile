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

export type IASEnvironmentKeys = 'PRODUCTION' | 'INTEGRATION' | 'FORMATION' | 'ACCEPTATION'

export type IASEnvironmentValue = {
  iasAgentInviteUrl: string
  iasPortalUrl: string
}

export type IASEnvironment = {
  [key in IASEnvironmentKeys]: { [K in key]: IASEnvironmentValue }
}[IASEnvironmentKeys]

export type Developer = {
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
  useManageEnvironment?: boolean
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
  USE_MANAGE_ENVIRONMENT = 'preferences/manageEnvironment',
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

export const iasEnvironments = {
  PRODUCTION: {
    iasAgentInviteUrl: Config.MEDIATOR_URL ?? '',
    iasPortalUrl:
      'https://authentification.quebec.ca/realms/sqin/protocol/openid-connect/auth?client_id=quebec-ca&redirect_uri=https%3A%2F%2Fauthentification.quebec.ca%2Facces%2Fverification%2F&state=2fec91c8-412f-42c3-8ce0-124bc4ef948f&response_mode=fragment&response_type=code&scope=openid&nonce=d56e3294-15ba-4f4f-88f8-1d0f86a2c21f&code_challenge=cLwCTTEuS-0w0xCMRlQ9dT2gZD2yG0llCyWBfWQT3ZY&code_challenge_method=S256',
  },
  FORMATION: {
    iasAgentInviteUrl: Config.MEDIATOR_URL_DEV ?? '',
    iasPortalUrl:
      'https://auth-formation.it.authentification.si.gouv.qc.ca/realms/sqin/protocol/openid-connect/auth?client_id=mock-pes-n1&redirect_uri=https%3A%2F%2Fpoc-pes-n1-formation.it.authentification.si.gouv.qc.ca%2Fsignin-oidc&response_type=code&scope=openid%20email&code_challenge=gczD7X3Axj6ZCifSgm8x7X0dfkgW0nH-Zhf2MhswFD4&code_challenge_method=S256&response_mode=form_post&nonce=638730001922181754.OWZjNGY2M2QtYTViNS00Y2RiLTk0OTYtODExYWFjZjc5MWIxOTAyNzU3NmEtZDcxMS00ZmQ0LTlmOGMtNDQ2ODY3OTYxMTA0&from=https%3A%2F%2Fpoc-op-formation.it.authentification.si.gouv.qc.ca&state=CfDJ8Ivgb90x-IBIpEWlgc3QCQITt3bfRKK1L_gCnVoJamCOWcW1tS2By6SMj2j9npKBsdhb4Kvo-ihd6tuyw4hB4c0zMKCtAROexbIb8hJE7z1qxCk4eJEuAgMz7AmmPbYwYl8wRG2ktjXO8WZchhPvMelYWfN1g_exuf_vq7ig6HTI2yVJbrF2jugLZ_btWbHLDcPI_W-yriuWZPIRU44WeeMq3nSBudhEreJz9jodx3MEBkwXvuIWF22msAAnW8mggrhCbXSS1Lz4em5uTaZ66EqKmPDtFQsuCgXKXN2kLjCScGKLN97pCQRVJ1NoM7Qp8Y6AgZocEKrQ4I3yEOXsTStXHlih8cD6enbHwVT9gjtizYLL4VA-O0eDT6rnt8MVRiHCrTtIDbNX-ldlTtRkowyH4nV7Rh1b2-HMHI-uPXE_&x-client-SKU=ID_NETSTANDARD2_0&x-client-ver=6.10.0.0',
  },
  ACCEPTATION: {
    iasAgentInviteUrl: Config.MEDIATOR_URL_DEV ?? '',
    iasPortalUrl:
      'https://auth-acceptation.dev.authentification.si.gouv.qc.ca/realms/sqin/protocol/openid-connect/auth?client_id=mock-pes-n1&redirect_uri=https%3A%2F%2Fpoc-pes-n1-acceptation.dev.authentification.si.gouv.qc.ca%2Fsignin-oidc&response_type=code&scope=openid%20email&code_challenge=mcTwVwWa7VE4OWbL8Pq8589HQSKAWsK4CyAr4HpLqeQ&code_challenge_method=S256&response_mode=form_post&nonce=638730001363246863.YTg4N2NhYTItYWZlYS00NzAyLWFmY2YtNmI5OGRiYTA2NTFmMWM3M2Q4ZjMtNDk1Yy00NDk1LWI1ZWEtOWMzYWFkNzNlM2Uw&from=https%3A%2F%2Fpoc-op-acceptation.dev.authentification.si.gouv.qc.ca&state=CfDJ8BfsX7HWed9Al-7xaY9C83iXPA3RxTIA1gu-9M6J4jsFHKuv4LT1y-N_vtg0XtmvUuu0_rvQkjYM_I-4h1cD-1uAy0UeMA3NTCHQV90tl7M1-41Td2xKHS5MehbBCd0eiSIzXM2qCYypG4mT6mbXtX07zPPqTZgSEEMM1W3pQyXW9irJiV8W3c1rFLoMJf3YyLVgftsnLRyn1qtwnuYqig5rMA6T4bOWY8BzFuL21pPG1CuZHxOtfZ9mc8E-YJji6VYRLcVo3fR2at1SdNs8sh8CoMnb_OYF1-X1WB5TtWh3j0haSplh5uju9qc4iyj5Vyt-tUEVdGGgK1tcJwprKAx4-sdNN1Is56swN0UA2A_44gTPIAW9E2QAIeuAZgbiZabejSrRY9gv8tH__sH-ZVh2JfAHYgwGXh3qKlob-3zY&x-client-SKU=ID_NETSTANDARD2_0&x-client-ver=6.10.0.0',
  },
  INTEGRATION: {
    iasAgentInviteUrl: Config.MEDIATOR_URL_DEV ?? '',
    iasPortalUrl:
      'https://auth-dev-integration.dev.authentification.si.gouv.qc.ca/realms/sqin/protocol/openid-connect/auth?client_id=mock-pes-n1&redirect_uri=https%3A%2F%2Fpoc-pes-n1-dev-integration.dev.authentification.si.gouv.qc.ca%2Fsignin-oidc&response_type=code&scope=openid%20email&code_challenge=cx2VcXYwu18LFOAeAbKUB_IoNFaMJE8CfweXClA0wSY&code_challenge_method=S256&response_mode=form_post&nonce=638730000309046200.YWEzYWY0ZTktNmI4Yi00YmE2LWE1ZGMtZTdmZDdhNzRlZmE5MDk2YjU3M2UtZWJjYy00MDMxLWJkMWMtYTE5MTBjZTc5MDNh&from=https%3A%2F%2Fpoc-op-dev-integration.dev.authentification.si.gouv.qc.ca&state=CfDJ8AufASH7vmhNsCjgg4DE1miohT559epKHNKm01ywDof7QydgtIeYh5aPt74962_70mjpoMUIVJk1p0vByb9j50NbbJGy4VUMuH0NkXIfneMO0HhfWVfrXGy10YWvjqHnsSwuOqI7TgPFoHlVmKN_lLbyQtG79j3Yww3wVAtjadXoX1B-f-6Wqm2KlcrHug5rrQRPvOvyMBHhBAQtgssw0jgAixsXarKcNtmzvaPhz9M36Pul0U9a7w0E5bKi7olHkB5XtiTP8dhlBc4lWkxN_Z4BOXCHj0aiO0BisDFE8LhHv3nDzeckMQKETfIjva1cSQ8kSWyd0tLbBR2sTco8QZV2hnxSMeeYi3muKXxtgFXASCk-OQUS-A-JDBNrw32PxpEeaA4HM_Fj124uh--sBzTozTo2tiQH16l7aFxl2C-j5xPsYEWAlU2uMxZtRsLbCA&x-client-SKU=ID_NETSTANDARD2_0&x-client-ver=6.10.0.0',
  },
}

export const defaultEnv = (Config.ENVIRONMENT as IASEnvironmentKeys) ?? 'PRODUCTION'

const developerState: Developer = {
  environment: {
    [defaultEnv]: iasEnvironments[defaultEnv],
  } as IASEnvironment,
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
      useManageEnvironment: defaultEnv !== 'PRODUCTION',
    },
    activities,
  }
}

const bcReducer = (state: BCState, action: ReducerAction<BCDispatchAction>): BCState => {
  switch (action.type) {
    case DeveloperDispatchAction.UPDATE_ENVIRONMENT: {
      // fallback
      const environment: IASEnvironmentKeys = (action?.payload || [defaultEnv]).pop()
      const developer = {
        ...state.developer,
        environment: {
          [environment]: iasEnvironments[environment],
        } as IASEnvironment,
      }

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
    case PreferencesQCDispatchAction.USE_MANAGE_ENVIRONMENT: {
      const useManageEnvironment: boolean = (action?.payload || []).pop()
      const preferences = { ...state.preferences, useManageEnvironment: useManageEnvironment }

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
