import {
  reducer as bifoldReducer,
  State as BifoldState,
  defaultState,
  mergeReducers,
  PersistentStorage,
  ReducerAction,
} from '@bifold/core'
import { BCSCCardProcess, EvidenceMetadata } from 'react-native-bcsc-core'
import Config from 'react-native-config'
import { getVersion } from 'react-native-device-info'
import { DeviceVerificationOption } from './bcsc-theme/api/hooks/useAuthorizationApi'
import { VerificationPhotoUploadPayload, VerificationPrompt } from './bcsc-theme/api/hooks/useEvidenceApi'
import { BCSCBannerMessage } from './bcsc-theme/components/AppBanner'
import { ProvinceCode } from './bcsc-theme/utils/address-utils'

export interface IASEnvironment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
  appToAppUrl: string
  iasApiBaseUrl: string
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

/**
 * Collection of metadata needed when a user is registering for the application
 * using non-bcsc identification cards. ie: drivers license + birth certificate etc...
 * These properties are then sent to IAS to authorize the user's device.
 */
export interface NonBCSCUserMetadata {
  name?: {
    first: string
    last: string
    middle?: string
  }
  address?: {
    streetAddress: string
    postalCode: string
    city: string
    province: ProvinceCode
    country: 'CA' // currently we only support Canada
  }
}

export interface BCSCState {
  appVersion: string
  nicknames: string[]
  selectedNickname?: string | null // undefined: nickname not set | null: nickname removed
  prompts?: VerificationPrompt[]
  videoDuration?: number
  photoMetadata?: VerificationPhotoUploadPayload
  photoPath?: string
  videoPath?: string
  videoThumbnailPath?: string
  bookmarks: string[]
  bannerMessages: BCSCBannerMessage[]
  analyticsOptIn: boolean
  accountSetupType?: AccountSetupType
  hasDismissedExpiryAlert?: boolean
}

/**
 * Secure state containing PII and sensitive data.
 *
 * To support rollback and migration from v3, this state mirrors v3 native storage
 * - This state is persisted to native secure storage (not AsyncStorage)
 * - Hydrated on app launch after successful authentication
 * - Cleared on account removal / logout
 */
export interface BCSCSecureState {
  /** Whether secure state has been loaded from native storage */
  isHydrated: boolean

  /** Whether an account exists (not persisted, checked and set at app startup and on registration) */
  hasAccount?: boolean

  /** Account verification status - determined from presence of valid credential */
  verified?: boolean

  // === from Tokens ===
  /** OAuth refresh token for API authentication */
  refreshToken?: string
  /** Registration access token for DCR updates */
  registrationAccessToken?: string
  /** Access token (largely unused from storage or state) */
  accessToken?: string

  // === from AuthorizationRequest ===
  /** Device code from authorization server */
  deviceCode?: string
  /** User code for device authorization */
  userCode?: string
  /** Expiration time for device code */
  deviceCodeExpiresAt?: Date
  /** Identification process type (e.g., 'IDIM L3 Remote BCSC Photo Identity Verification') */
  cardProcess?: BCSCCardProcess
  /** User's birthdate from BC Services Card - used during verification */
  birthdate?: Date
  /** BC Services Card serial number */
  serial?: string
  /** User's email address */
  email?: string
  /** Whether user's email has been verified */
  isEmailVerified?: boolean
  /** Verification request ID for evidence upload */
  verificationRequestId?: string
  /** SHA hash for verification request */
  verificationRequestSha?: string
  /** Available verification options from authorization request */
  verificationOptions?: DeviceVerificationOption[]

  // === Non-BCSC User Metadata ===
  /** Metadata for users verifying with non-BCSC cards (name, address) */
  userMetadata?: NonBCSCUserMetadata

  // === Account Flags (flattened) ===
  /** Whether user chose to skip email verification */
  userSkippedEmailVerification?: boolean
  /** User's email address (if entered but not yet verified) */
  emailAddress?: string
  /** Temporary email ID for pending verification */
  temporaryEmailId?: string
  /** Whether user has submitted a verification video */
  userSubmittedVerificationVideo?: boolean

  // === from Evidence Data ===
  /** Additional evidence data for non-BCSC verification */
  additionalEvidenceData: EvidenceMetadata[] // initialized as an empty array to prevent ?.length usage

  // === Security ===
  /** PBKDF2 hash of PIN used for Askar wallet encryption */
  walletKey?: string

  hasDismissedExpiryAlert?: boolean
}

/** Initial secure state - unhydrated with no data */
export const initialBCSCSecureState: BCSCSecureState = {
  isHydrated: false,
  additionalEvidenceData: [], // initialized as an empty array to prevent ?.length usage
}

export enum Mode {
  BCWallet = 'bcwallet',
  BCSC = 'bcsc',
}

export enum AccountSetupType {
  AddAccount = 'AddAccount',
  TransferAccount = 'TransferAccount',
}

export interface BCState extends BifoldState {
  developer: Developer
  dismissPersonCredentialOffer: DismissPersonCredentialOffer
  bcsc: BCSCState
  bcscSecure: BCSCSecureState
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
  UPDATE_APP_VERSION = 'bcsc/updateAppVersion',
  ADD_NICKNAME = 'bcsc/addNickname',
  UPDATE_NICKNAME = 'bcsc/updateNickname',
  SELECT_ACCOUNT = 'bcsc/selectAccount',
  UPDATE_VIDEO_PROMPTS = 'bcsc/updateVideoPrompts',
  SAVE_PHOTO = 'bcsc/savePhoto',
  SAVE_VIDEO = 'bcsc/saveVideo',
  SAVE_VIDEO_THUMBNAIL = 'bcsc/saveVideoThumbnail',
  ADD_BOOKMARK = 'bcsc/addBookmark',
  REMOVE_BOOKMARK = 'bcsc/removeBookmark',
  CLEAR_BCSC = 'bcsc/clearBCSC',
  ADD_BANNER_MESSAGE = 'bcsc/addBannerMessage',
  REMOVE_BANNER_MESSAGE = 'bcsc/removeBannerMessage',
  RESET_SEND_VIDEO = 'bcsc/clearPhotoAndVideo',
  UPDATE_ANALYTICS_OPT_IN = 'bcsc/updateAnalyticsOptIn',
  HIDE_DEVICE_AUTH_CONFIRMATION = 'bcsc/hideDeviceAuthConfirmation',
  // Secure state actions
  HYDRATE_SECURE_STATE = 'bcsc/hydrateSecureState',
  CLEAR_SECURE_STATE = 'bcsc/clearSecureState',
  SUCCESSFUL_AUTH = 'bcsc/successfulAuth',
  SET_HAS_ACCOUNT = 'bcsc/setHasAccount',
  UPDATE_SECURE_SERIAL = 'bcsc/updateSecureSerial',
  UPDATE_SECURE_BIRTHDATE = 'bcsc/updateSecureBirthdate',
  UPDATE_SECURE_EMAIL = 'bcsc/updateSecureEmail',
  UPDATE_SECURE_DEVICE_CODE = 'bcsc/updateSecureDeviceCode',
  UPDATE_SECURE_USER_CODE = 'bcsc/updateSecureUserCode',
  UPDATE_SECURE_DEVICE_CODE_EXPIRES_AT = 'bcsc/updateSecureDeviceCodeExpiresAt',
  UPDATE_SECURE_CARD_PROCESS = 'bcsc/updateSecureCardProcess',
  UPDATE_SECURE_USER_METADATA = 'bcsc/updateSecureUserMetadata',
  UPDATE_SECURE_REFRESH_TOKEN = 'bcsc/updateSecureRefreshToken',
  UPDATE_SECURE_REGISTRATION_ACCESS_TOKEN = 'bcsc/updateSecureRegistrationAccessToken',
  UPDATE_SECURE_ACCESS_TOKEN = 'bcsc/updateSecureAccessToken',
  UPDATE_SECURE_IS_EMAIL_VERIFIED = 'bcsc/updateSecureIsEmailVerified',
  UPDATE_SECURE_USER_SKIPPED_EMAIL_VERIFICATION = 'bcsc/updateSecureUserSkippedEmailVerification',
  UPDATE_SECURE_EMAIL_ADDRESS = 'bcsc/updateSecureEmailAddress',
  UPDATE_SECURE_TEMPORARY_EMAIL_ID = 'bcsc/updateSecureTemporaryEmailId',
  UPDATE_SECURE_USER_SUBMITTED_VERIFICATION_VIDEO = 'bcsc/updateSecureUserSubmittedVerificationVideo',
  UPDATE_SECURE_VERIFICATION_REQUEST_ID = 'bcsc/updateSecureVerificationRequestId',
  UPDATE_SECURE_VERIFICATION_REQUEST_SHA = 'bcsc/updateSecureVerificationRequestSha',
  UPDATE_SECURE_VERIFICATION_OPTIONS = 'bcsc/updateSecureVerificationOptions',
  UPDATE_SECURE_VERIFIED = 'bcsc/updateSecureVerified',
  UPDATE_SECURE_WALLET_KEY = 'bcsc/updateSecureWalletKey',
  UPDATE_SECURE_EVIDENCE_METADATA = 'bcsc/updateAdditionalEvidenceMetadata',
  ACCOUNT_SETUP_TYPE = 'bcsc/accountSetupType',
  DISMISSED_EXPIRY_ALERT = 'bcsc/dismissedExpiryAlert',
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

export const getInitialEnvironment = (): IASEnvironment => {
  if (__DEV__ && Config.BUILD_TARGET === Mode.BCSC) {
    return IASEnvironment.SIT
  }

  return IASEnvironment.PROD
}

const createIASEnvironment = (config: {
  name: string
  subdomain: string
  agentInviteUrl: string | null
}): IASEnvironment => {
  return {
    name: `${config.name} (${config.subdomain})`,
    iasAgentInviteUrl: config.agentInviteUrl ?? '',
    iasPortalUrl: `https://${config.subdomain}.gov.bc.ca/issuer/v1/dids`,
    appToAppUrl: `ca.bc.gov.${config.subdomain}.servicescard.v2://credentials/person/v1`,
    iasApiBaseUrl: `https://${config.subdomain}.gov.bc.ca`,
  }
}

// TODO (MD): Add IASAgentInviteUrls for all environments once known
export const IASEnvironment = {
  PROD: createIASEnvironment({
    name: 'Prod',
    subdomain: 'id',
    agentInviteUrl:
      'https://idim-agent.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNWY2NTYzYWItNzEzYi00YjM5LWI5MTUtNjY2YjJjNDc4M2U2IiwgImxhYmVsIjogIlNlcnZpY2UgQkMiLCAicmVjaXBpZW50S2V5cyI6IFsiN2l2WVNuN3NocW8xSkZyYm1FRnVNQThMNDhaVnh2TnpwVkN6cERSTHE4UmoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSIsICJpbWFnZVVybCI6ICJodHRwczovL2lkLmdvdi5iYy5jYS9zdGF0aWMvR292LTIuMC9pbWFnZXMvZmF2aWNvbi5pY28ifQ==',
  }),
  PREPROD: createIASEnvironment({
    name: 'Preprod',
    subdomain: 'idpreprod',
    agentInviteUrl: null,
  }),
  QA: createIASEnvironment({
    name: 'QA',
    subdomain: 'idqa',
    agentInviteUrl: null,
  }),
  TEST: createIASEnvironment({
    name: 'Test',
    subdomain: 'idtest',
    agentInviteUrl: null,
  }),
  SIT: createIASEnvironment({
    name: 'Sit',
    subdomain: 'idsit',
    agentInviteUrl:
      'https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZDFkMDk5MDQtN2ZlOC00YzlkLTk4YjUtZmNmYmEwODkzZTAzIiwgImxhYmVsIjogIlNlcnZpY2UgQkMgKFNJVCkiLCAicmVjaXBpZW50S2V5cyI6IFsiNVgzblBoZkVIOU4zb05kcHdqdUdjM0ZhVzNQbmhiY05QemRGbzFzS010dEoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tc2l0LWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyJ9',
  }),
  DEV: createIASEnvironment({
    name: 'Dev',
    subdomain: 'iddev',
    agentInviteUrl:
      'https://idim-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiY2U1NWFiZDctNWRmYy00YjQ5LWExODYtOWUzMzQ1ZjEyZThkIiwgImxhYmVsIjogIlNlcnZpY2UgQkMgKERldikiLCAicmVjaXBpZW50S2V5cyI6IFsiM0I0bnlDMVg4R1E0M0NLczR4clVXOFdnbWE5MUpMem50cVVYdlo0UjQ4TXQiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQtZGV2LmFwcHMuc2lsdmVyLmRldm9wcy5nb3YuYmMuY2EiLCAiaW1hZ2VVcmwiOiAiaHR0cHM6Ly9pZC5nb3YuYmMuY2Evc3RhdGljL0dvdi0yLjAvaW1hZ2VzL2Zhdmljb24uaWNvIn0=',
  }),
  DEV2: createIASEnvironment({
    name: 'Dev2',
    subdomain: 'iddev2',
    agentInviteUrl: null,
  }),
}

const remoteDebuggingState: RemoteDebuggingState = {
  enabledAt: undefined,
  sessionId: undefined,
}

const developerState: Developer = {
  enableProxy: false,
  environment: getInitialEnvironment(),
  remoteDebugging: remoteDebuggingState,
  enableAppToAppPersonFlow: false,
}

const dismissPersonCredentialOfferState: DismissPersonCredentialOffer = {
  personCredentialOfferDismissed: false,
}

export const initialBCSCState: BCSCState = {
  appVersion: getVersion(),
  nicknames: [],
  selectedNickname: undefined,
  bookmarks: [],
  bannerMessages: [],
  analyticsOptIn: false,
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
  bcsc: initialBCSCState,
  bcscSecure: initialBCSCSecureState,
  mode: Config.BUILD_TARGET === Mode.BCSC ? Mode.BCSC : Mode.BCWallet,
}

const bcReducer = (state: BCState, action: ReducerAction<BCDispatchAction>): BCState => {
  switch (action.type) {
    case ModeDispatchAction.UPDATE_MODE: {
      const mode: Mode = (action?.payload || []).pop() || Mode.BCWallet
      // If the mode isn't actually changing, do nothing
      if (state.mode === mode) {
        return state
      }
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
          developer.remoteDebugging
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
        developer.enableAppToAppPersonFlow
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
        newState.dismissPersonCredentialOffer
      )

      return newState
    }
    case BCSCDispatchAction.UPDATE_APP_VERSION: {
      const bcsc = { ...state.bcsc, appVersion: getVersion() }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.ADD_NICKNAME: {
      const nickname = (action?.payload || []).pop() ?? ''
      const newNicknames = [...state.bcsc.nicknames, nickname]
      const bcsc = { ...state.bcsc, nicknames: newNicknames }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.SELECT_ACCOUNT: {
      const selectedNickname = (action?.payload || []).pop() ?? undefined
      const bcsc = { ...state.bcsc, selectedNickname }
      const newState = { ...state, bcsc }
      // do not persist, should be checked on every app start
      return newState
    }
    case BCSCDispatchAction.UPDATE_NICKNAME: {
      const { nickname, newNickname } = (action?.payload || []).pop() ?? {}
      const newNicknames = state.bcsc.nicknames.filter((n) => n !== nickname).concat([newNickname])
      const bcsc = { ...state.bcsc, nicknames: newNicknames }
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
    case BCSCDispatchAction.SAVE_PHOTO: {
      const { photoPath, photoMetadata } = (action.payload ?? []).pop()
      const bcsc = { ...state.bcsc, photoPath, photoMetadata }
      const newState = { ...state, bcsc }
      return newState
    }
    case BCSCDispatchAction.SAVE_VIDEO: {
      const { videoPath, videoDuration } = (action.payload ?? []).pop()
      const bcsc = { ...state.bcsc, videoPath, videoDuration }
      const newState = { ...state, bcsc }
      return newState
    }
    case BCSCDispatchAction.SAVE_VIDEO_THUMBNAIL: {
      const videoThumbnailPath = (action.payload ?? []).pop()
      const bcsc = { ...state.bcsc, videoThumbnailPath }
      const newState = { ...state, bcsc }
      return newState
    }
    case BCSCDispatchAction.RESET_SEND_VIDEO: {
      const bcsc = {
        ...state.bcsc,
        photoPath: undefined,
        photoMetadata: undefined,
        videoPath: undefined,
        videoDuration: undefined,
        videoThumbnailPath: undefined,
        prompts: undefined,
      }
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

    // Secure state management - not persisted to AsyncStorage
    case BCSCDispatchAction.HYDRATE_SECURE_STATE: {
      const partialSecureState: Partial<BCSCSecureState> = (action?.payload || []).pop() ?? {}
      const bcscSecure = { ...state.bcscSecure, ...partialSecureState, isHydrated: true }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.CLEAR_SECURE_STATE: {
      // Optionally accept a partial BCSCSecure state to merge with the initial state
      const partialSecureState: Partial<BCSCSecureState> = (action?.payload || []).pop() ?? {}
      const bcscSecure = { ...initialBCSCSecureState, ...partialSecureState }
      return { ...state, bcscSecure }
    }
    // batched state update to prevent re-renders
    case BCSCDispatchAction.SUCCESSFUL_AUTH: {
      const bcscSecure = { ...state.bcscSecure, hasAccount: true }
      const authentication = { ...state.authentication, didAuthenticate: true }
      return { ...state, bcscSecure, authentication }
    }
    case BCSCDispatchAction.SET_HAS_ACCOUNT: {
      const hasAccount = (action?.payload || []).pop() ?? false
      const bcscSecure = { ...state.bcscSecure, hasAccount }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_SERIAL: {
      const serial = (action?.payload || []).pop() ?? ''
      const bcscSecure = { ...state.bcscSecure, serial }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_BIRTHDATE: {
      const birthdate = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, birthdate }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_EMAIL: {
      const email = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, email }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_DEVICE_CODE: {
      const deviceCode = (action?.payload || []).pop() ?? ''
      const bcscSecure = { ...state.bcscSecure, deviceCode }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_USER_CODE: {
      const userCode = (action?.payload || []).pop() ?? ''
      const bcscSecure = { ...state.bcscSecure, userCode }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_DEVICE_CODE_EXPIRES_AT: {
      const deviceCodeExpiresAt = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, deviceCodeExpiresAt }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_CARD_PROCESS: {
      const cardProcess = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, cardProcess }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_USER_METADATA: {
      const userMetadata = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, userMetadata }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_REFRESH_TOKEN: {
      const refreshToken = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, refreshToken }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_REGISTRATION_ACCESS_TOKEN: {
      const registrationAccessToken = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, registrationAccessToken }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_ACCESS_TOKEN: {
      const accessToken = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, accessToken }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_IS_EMAIL_VERIFIED: {
      const isEmailVerified = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, isEmailVerified }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_USER_SKIPPED_EMAIL_VERIFICATION: {
      const userSkippedEmailVerification = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, userSkippedEmailVerification }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_EMAIL_ADDRESS: {
      const emailAddress = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, emailAddress }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_TEMPORARY_EMAIL_ID: {
      const temporaryEmailId = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, temporaryEmailId }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_USER_SUBMITTED_VERIFICATION_VIDEO: {
      const userSubmittedVerificationVideo = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, userSubmittedVerificationVideo }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID: {
      const verificationRequestId = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, verificationRequestId }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA: {
      const verificationRequestSha = (action?.payload || []).pop() ?? undefined
      const bcscSecure = { ...state.bcscSecure, verificationRequestSha }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_VERIFICATION_OPTIONS: {
      const verificationOptions = (action?.payload || []).pop() ?? []
      const bcscSecure = { ...state.bcscSecure, verificationOptions }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_VERIFIED: {
      const verified = (action?.payload || []).pop() ?? false
      const bcscSecure = { ...state.bcscSecure, verified }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_WALLET_KEY: {
      const [walletKey] = action.payload as [string | undefined]
      const bcscSecure = { ...state.bcscSecure, walletKey }
      return { ...state, bcscSecure }
    }
    case BCSCDispatchAction.UPDATE_SECURE_EVIDENCE_METADATA: {
      const additionalEvidenceData: EvidenceMetadata[] = (action?.payload || []).pop()
      const bcscSecure = { ...state.bcscSecure, additionalEvidenceData }
      return { ...state, bcscSecure }
    }

    case BCSCDispatchAction.CLEAR_BCSC: {
      // Optionally accept a partial BCSC state to merge with the initial state
      const partialBcscState = (action?.payload || []).pop() ?? {}
      const bcsc = { ...initialBCSCState, ...partialBcscState }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }

    case BCSCDispatchAction.ADD_BANNER_MESSAGE: {
      const bannerMessage: BCSCBannerMessage = (action?.payload || []).pop()

      // Remove any existing banner with the same id before adding the new one
      // This allows us to update existing banners and prevents duplicates
      const bannerMessages = state.bcsc.bannerMessages.filter((banner) => banner.id !== bannerMessage.id)
      bannerMessages.push(bannerMessage)

      const bcsc = { ...state.bcsc, bannerMessages }
      const newState = { ...state, bcsc }

      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }
    case BCSCDispatchAction.REMOVE_BANNER_MESSAGE: {
      const bannerId = (action?.payload || []).pop()

      // Filter out the banner with the specified id
      const bannerMessages = state.bcsc.bannerMessages.filter((banner) => banner.id !== bannerId)

      const bcsc = { ...state.bcsc, bannerMessages }
      const newState = { ...state, bcsc }

      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }

    case BCSCDispatchAction.UPDATE_ANALYTICS_OPT_IN: {
      const analyticsOptIn = (action?.payload || []).pop() ?? false
      const bcsc = { ...state.bcsc, analyticsOptIn }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }

    case BCSCDispatchAction.ACCOUNT_SETUP_TYPE: {
      const accountType = (action?.payload || []).pop() ?? undefined
      const bcsc = { ...state.bcsc, accountSetupType: accountType }
      const newState = { ...state, bcsc }
      PersistentStorage.storeValueForKey<BCSCState>(BCLocalStorageKeys.BCSC, bcsc)
      return newState
    }

    case BCSCDispatchAction.DISMISSED_EXPIRY_ALERT: {
      // this should use the date as a key, so this variable is always up to date...
      const hasDismissed = (action?.payload || []).pop() ?? undefined
      const bcsc = { ...state.bcsc, hasDismissedExpiryAlert: hasDismissed }
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
