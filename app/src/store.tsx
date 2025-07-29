import {
  State as BifoldState,
  mergeReducers,
  reducer as bifoldReducer,
  defaultState,
  ReducerAction,
  PersistentStorage,
} from '@bifold/core'

import { BCSCCardType } from '@bcsc-theme/types/cards'
import {
  VerificationPhotoUploadPayload,
  VerificationPrompt,
  VerificationVideoUploadPayload,
} from './bcsc-theme/api/hooks/useEvidenceApi'

export interface IASEnvironment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
  appToAppUrl: string
}

export type RemoteDebuggingState = {
  enabledAt?: Date
  sessionId?: number
}

export interface Developer {
  environment: IASEnvironment
  remoteDebugging: RemoteDebuggingState
  enableProxy: boolean
  enableAppToAppPersonFlow: boolean
}

export interface DismissPersonCredentialOffer {
  personCredentialOfferDismissed: boolean
}

export interface BCSCState {
  verified: boolean
  cardType: BCSCCardType
  serial: string
  birthdate?: Date
  email?: string
  emailConfirmed?: boolean
  deviceCode?: string
  userCode?: string
  deviceCodeExpiresAt?: Date
  pendingVerification?: boolean
  prompts?: VerificationPrompt[]
  videoMetadata?: VerificationVideoUploadPayload
  photoMetadata?: VerificationPhotoUploadPayload
  refreshToken?: string
  photoPath?: string
  videoPath?: string
  videoThumbnailPath?: string
  bookmarks: string[]
  verificationRequestId?: string
  verificationRequestSha?: string
  additionalIdentification: {}[]
}

export enum Mode {
  BCWallet = 'bcwallet',
  BCSC = 'bcsc',
}

export interface BCState extends BifoldState {
  developer: Developer
  dismissPersonCredentialOffer: DismissPersonCredentialOffer
  bcsc: BCSCState
  mode: Mode
}

enum DeveloperDispatchAction {
  UPDATE_ENVIRONMENT = 'developer/updateEnvironment',
  TOGGLE_PROXY = 'developer/toggleProxy',
  TOGGLE_APP_TO_APP_PERSON_FLOW = 'developer/toggleAppToAppPersonFlow',
}

enum DismissPersonCredentialOfferDispatchAction {
  PERSON_CREDENTIAL_OFFER_DISMISSED = 'dismissPersonCredentialOffer/personCredentialOfferDismissed',
}

enum RemoteDebuggingDispatchAction {
  REMOTE_DEBUGGING_STATUS_UPDATE = 'remoteDebugging/enable',
}

enum BCSCDispatchAction {
  UPDATE_VERIFIED = 'bcsc/updateVerified',
  UPDATE_CARD_TYPE = 'bcsc/updateCardType',
  UPDATE_SERIAL = 'bcsc/updateSerial',
  UPDATE_BIRTHDATE = 'bcsc/updateBirthdate',
  UPDATE_EMAIL = 'bcsc/updateEmail',
  UPDATE_DEVICE_CODE = 'bcsc/updateDeviceCode',
  UPDATE_USER_CODE = 'bcsc/updateUserCode',
  UPDATE_DEVICE_CODE_EXPIRES_AT = 'bcsc/updateDeviceCodeExpiresAt',
  UPDATE_PENDING_VERIFICATION = 'bcsc/updatePendingVerification',
  UPDATE_REFRESH_TOKEN = 'bcsc/updateRefreshToken',
  UPDATE_VIDEO_PROMPTS = 'bcsc/updateVideoPrompts',
  SAVE_PHOTO = 'bcsc/savePhoto',
  SAVE_VIDEO = 'bcsc/saveVideo',
  SAVE_VIDEO_THUMBNAIL = 'bcsc/saveVideoThumbnail',
  ADD_BOOKMARK = 'bcsc/addBookmark',
  REMOVE_BOOKMARK = 'bcsc/removeBookmark',
  UPDATE_VERIFICATION_REQUEST = 'bcsc/updateVerificationRequest',
}

enum ModeDispatchAction {
  UPDATE_MODE = 'mode/updateMode',
}

export type BCDispatchAction =
  | DeveloperDispatchAction
  | DismissPersonCredentialOfferDispatchAction
  | RemoteDebuggingDispatchAction
  | BCSCDispatchAction
  | ModeDispatchAction

export const BCDispatchAction = {
  ...DeveloperDispatchAction,
  ...DismissPersonCredentialOfferDispatchAction,
  ...RemoteDebuggingDispatchAction,
  ...BCSCDispatchAction,
  ...ModeDispatchAction,
}

export const iasEnvironments: Array<IASEnvironment> = [
  {
    name: 'Production',
    iasAgentInviteUrl:
      'https://idim-agent.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNWY2NTYzYWItNzEzYi00YjM5LWI5MTUtNjY2YjJjNDc4M2U2IiwgImxhYmVsIjogIlNlcnZpY2UgQkMiLCAicmVjaXBpZW50S2V5cyI6IFsiN2l2WVNuN3NocW8xSkZyYm1FRnVNQThMNDhaVnh2TnpwVkN6cERSTHE4UmoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSIsICJpbWFnZVVybCI6ICJodHRwczovL2lkLmdvdi5iYy5jYS9zdGF0aWMvR292LTIuMC9pbWFnZXMvZmF2aWNvbi5pY28ifQ==',
    iasPortalUrl: 'https://id.gov.bc.ca/issuer/v1/dids',
    appToAppUrl: 'ca.bc.gov.id.servicescard.v2://credentials/person/v1',
  },
  {
    name: 'Development',
    iasAgentInviteUrl:
      'https://idim-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiY2U1NWFiZDctNWRmYy00YjQ5LWExODYtOWUzMzQ1ZjEyZThkIiwgImxhYmVsIjogIlNlcnZpY2UgQkMgKERldikiLCAicmVjaXBpZW50S2V5cyI6IFsiM0I0bnlDMVg4R1E0M0NLczR4clVXOFdnbWE5MUpMem50cVVYdlo0UjQ4TXQiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQtZGV2LmFwcHMuc2lsdmVyLmRldm9wcy5nb3YuYmMuY2EiLCAiaW1hZ2VVcmwiOiAiaHR0cHM6Ly9pZC5nb3YuYmMuY2Evc3RhdGljL0dvdi0yLjAvaW1hZ2VzL2Zhdmljb24uaWNvIn0=',
    iasPortalUrl: 'https://iddev.gov.bc.ca/issuer/v1/dids',
    appToAppUrl: 'ca.bc.gov.iddev.servicescard.v2://credentials/person/v1',
  },
  {
    name: 'Test',
    iasAgentInviteUrl:
      'https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZDFkMDk5MDQtN2ZlOC00YzlkLTk4YjUtZmNmYmEwODkzZTAzIiwgImxhYmVsIjogIlNlcnZpY2UgQkMgKFNJVCkiLCAicmVjaXBpZW50S2V5cyI6IFsiNVgzblBoZkVIOU4zb05kcHdqdUdjM0ZhVzNQbmhiY05QemRGbzFzS010dEoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tc2l0LWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyJ9',
    iasPortalUrl: 'https://idsit.gov.bc.ca/issuer/v1/dids',
    appToAppUrl: 'ca.bc.gov.iddev.servicescard.v2://credentials/person/v1',
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
  enableAppToAppPersonFlow: false,
}

const dismissPersonCredentialOfferState: DismissPersonCredentialOffer = {
  personCredentialOfferDismissed: false,
}

const bcscState: BCSCState = {
  verified: false,
  cardType: BCSCCardType.None,
  serial: '',
  birthdate: undefined,
  bookmarks: [],
  email: undefined,
  userCode: undefined,
  deviceCode: undefined,
  deviceCodeExpiresAt: undefined,
  refreshToken: undefined,
  verificationRequestId: undefined,
  verificationRequestSha: undefined,
  additionalIdentification: [],
}

export enum BCLocalStorageKeys {
  PersonCredentialOfferDismissed = 'PersonCredentialOfferDismissed',
  Environment = 'Environment',
  GenesisTransactions = 'GenesisTransactions',
  RemoteDebugging = 'RemoteDebugging',
  EnableProxy = 'EnableProxy',
  EnableAppToAppPersonFlow = 'EnableAppToAppPersonFlow',
  UserDeniedPushNotifications = 'userDeniedPushNotifications',
  DeviceToken = 'deviceToken',
  BCSC = 'BCSC',
  Mode = 'Mode',
}

export const initialState: BCState = {
  ...defaultState,
  preferences: { ...defaultState.preferences, useDataRetention: false, disableDataRetentionOption: true },
  developer: developerState,
  dismissPersonCredentialOffer: dismissPersonCredentialOfferState,
  bcsc: bcscState,
  mode: Mode.BCWallet,
}

const bcReducer = (state: BCState, action: ReducerAction<BCDispatchAction>): BCState => {
  switch (action.type) {
    case ModeDispatchAction.UPDATE_MODE: {
      const mode: Mode = (action?.payload || []).pop() || Mode.BCWallet
      // If the mode isn't actually changing, do nothing
      if (state.mode === mode) return state
      const newState = { ...state, mode }
      PersistentStorage.storeValueForKey<Mode>(BCLocalStorageKeys.Mode, mode)
      return newState
    }
    case RemoteDebuggingDispatchAction.REMOTE_DEBUGGING_STATUS_UPDATE: {
      const { enabledAt, sessionId } = (action.payload || []).pop()
      const developer = { ...state.developer, remoteDebugging: { enabledAt, sessionId } }
      const newState = { ...state, developer }

      if (enabledAt) {
        PersistentStorage.storeValueForKey<RemoteDebuggingState>(
          BCLocalStorageKeys.RemoteDebugging,
          developer.remoteDebugging,
        )
      } else {
        PersistentStorage.removeValueForKey(BCLocalStorageKeys.RemoteDebugging)
      }

      return newState
    }
    case DeveloperDispatchAction.UPDATE_ENVIRONMENT: {
      const environment: IASEnvironment = (action?.payload || []).pop()
      const developer = { ...state.developer, environment }

      // Persist IAS environment between app restarts
      PersistentStorage.storeValueForKey<IASEnvironment>(BCLocalStorageKeys.Environment, developer.environment)

      return { ...state, developer }
    }
    case DeveloperDispatchAction.TOGGLE_PROXY: {
      const enableProxy: boolean = (action?.payload || []).pop() || false
      const developer = { ...state.developer, enableProxy }

      PersistentStorage.storeValueForKey<boolean>(BCLocalStorageKeys.EnableProxy, developer.enableProxy)

      return { ...state, developer }
    }
    case DeveloperDispatchAction.TOGGLE_APP_TO_APP_PERSON_FLOW: {
      const enableAppToAppPersonFlow: boolean = (action?.payload || []).pop() || false
      const developer = { ...state.developer, enableAppToAppPersonFlow }

      PersistentStorage.storeValueForKey<boolean>(
        BCLocalStorageKeys.EnableAppToAppPersonFlow,
        developer.enableAppToAppPersonFlow,
      )

      return { ...state, developer }
    }
    case DismissPersonCredentialOfferDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED: {
      const { personCredentialOfferDismissed } = (action?.payload || []).pop()
      const dismissPersonCredentialOffer = { ...state.dismissPersonCredentialOffer, personCredentialOfferDismissed }
      const newState = { ...state, dismissPersonCredentialOffer }

      // save to storage so notification doesn't reapper on app restart
      PersistentStorage.storeValueForKey<DismissPersonCredentialOffer>(
        BCLocalStorageKeys.PersonCredentialOfferDismissed,
        newState.dismissPersonCredentialOffer,
      )

      return newState
    }
    case BCSCDispatchAction.UPDATE_VERIFIED: {
      const verified = (action?.payload || []).pop() ?? false
      const bcsc = { ...state.bcsc, verified }
      const newState = { ...state, bcsc }
      // don't persist, should be checked on every app start
      return newState
    }
    case BCSCDispatchAction.UPDATE_CARD_TYPE: {
      const cardType = (action?.payload ?? []).pop() ?? BCSCCardType.None
      const bcsc = { ...state.bcsc, cardType }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_SERIAL: {
      const serial = (action?.payload || []).pop() ?? ''
      const bcsc = { ...state.bcsc, serial }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_EMAIL: {
      const { email, emailConfirmed } = (action?.payload || []).pop() ?? {}
      const bcsc = { ...state.bcsc, email, emailConfirmed }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_BIRTHDATE: {
      const birthdate = (action?.payload || []).pop() ?? undefined
      const bcsc = { ...state.bcsc, birthdate }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_USER_CODE: {
      const userCode = (action?.payload || []).pop() ?? ''
      const bcsc = { ...state.bcsc, userCode }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_DEVICE_CODE: {
      const deviceCode = (action?.payload || []).pop() ?? ''
      const bcsc = { ...state.bcsc, deviceCode }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_PENDING_VERIFICATION: {
      const pendingVerification = (action?.payload || []).pop() ?? false
      const bcsc = { ...state.bcsc, pendingVerification }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_VIDEO_PROMPTS: {
      const prompts: VerificationPrompt[] = (action?.payload || []).pop()
      const bcsc = { ...state.bcsc, prompts }
      const newState = { ...state, bcsc }
      return newState
    }
    case BCSCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT: {
      const deviceCodeExpiresAt = (action?.payload || []).pop() ?? undefined
      const bcsc = { ...state.bcsc, deviceCodeExpiresAt }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_REFRESH_TOKEN: {
      const refreshToken = (action?.payload || []).pop() ?? undefined
      const bcsc = { ...state.bcsc, refreshToken }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.SAVE_PHOTO: {
      const { photoPath, photoMetadata } = (action.payload ?? []).pop()
      const bcsc = { ...state.bcsc, photoPath, photoMetadata }
      const newState = { ...state, bcsc }
      return newState
    }
    case BCSCDispatchAction.SAVE_VIDEO: {
      const { videoPath, videoMetadata } = (action.payload ?? []).pop()
      const bcsc = { ...state.bcsc, videoPath, videoMetadata }
      const newState = { ...state, bcsc }
      return newState
    }
    case BCSCDispatchAction.SAVE_VIDEO_THUMBNAIL: {
      const videoThumbnailPath = (action.payload ?? []).pop()
      const bcsc = { ...state.bcsc, videoThumbnailPath }
      const newState = { ...state, bcsc }
      return newState
    }
    case BCSCDispatchAction.ADD_BOOKMARK: {
      const bookmark = (action.payload ?? []).pop()
      const bcsc = { ...state.bcsc, bookmarks: [...new Set([...state.bcsc.bookmarks, bookmark])] }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)

      return newState
    }
    case BCSCDispatchAction.REMOVE_BOOKMARK: {
      const bookmark = (action.payload ?? []).pop()
      const bookmarks = state.bcsc.bookmarks.filter((b) => b !== bookmark)
      const bcsc = { ...state.bcsc, bookmarks }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.UPDATE_VERIFICATION_REQUEST: {
      const evidence = (action?.payload || []).pop() ?? undefined
      const bcsc = { ...state.bcsc, verificationRequestId: evidence?.id, verificationRequestSha: evidence?.sha256 }
      const newState = { ...state, bcsc }

      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)

      return newState
    }
    default:
      return state
  }
}

// @ts-expect-error - states for the bifoldReducer and bcReducer are different, still works though
export const reducer = mergeReducers(bifoldReducer, bcReducer)
