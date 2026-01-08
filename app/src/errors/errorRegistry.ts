import { AlertEvent } from '../events/alertEvents'

/**
 * Error severity levels for categorization and analytics
 */
export enum ErrorSeverity {
  /** Informational - user action may be needed but no error occurred */
  INFO = 'info',
  /** Warning - something unexpected happened but operation can continue */
  WARNING = 'warning',
  /** Error - operation failed, user needs to take action */
  ERROR = 'error',
  /** Critical - app functionality is compromised */
  CRITICAL = 'critical',
}

/**
 * Error category for grouping related errors
 */
export enum ErrorCategory {
  CAMERA = 'camera',
  NETWORK = 'network',
  AUTHENTICATION = 'auth',
  CREDENTIAL = 'credential',
  PROOF = 'proof',
  CONNECTION = 'connection',
  WALLET = 'wallet',
  VERIFICATION = 'verification',
  DEVICE = 'device',
  STORAGE = 'storage',
  TOKEN = 'token',
  GENERAL = 'general',
}

/**
 * Error definition containing all metadata for an error type
 */
export interface ErrorDefinition {
  /** Unique error code (for support reference) */
  code: number
  /** AlertEvent key for Snowplow analytics */
  alertEvent: AlertEvent
  /** i18n key for title */
  titleKey: string
  /** i18n key for description */
  descriptionKey: string
  /** Error severity */
  severity: ErrorSeverity
  /** Error category */
  category: ErrorCategory
  /** Whether to show modal to user (default: true) */
  showModal?: boolean
}

/**
 * Master registry of all BC Wallet errors
 *
 * Code ranges:
 *   1000-1099: Bifold core errors (reserved)
 *   2000-2099: Camera/Scanning errors
 *   2100-2199: Network errors
 *   2200-2299: Authentication/Login errors
 *   2300-2399: Credential/Card errors
 *   2400-2499: Verification errors
 *   2500-2599: Token/Crypto errors
 *   2600-2699: Storage errors
 *   2700-2799: Device errors
 *   2800-2899: General/Misc errors
 */
export const ErrorRegistry = {
  // ============================================
  // Camera/Scanning Errors (2000-2099)
  // ============================================
  CAMERA_BROKEN: {
    code: 2000,
    alertEvent: AlertEvent.ADD_CARD_CAMERA_BROKEN,
    titleKey: 'BCWalletError.Camera.Title',
    descriptionKey: 'BCWalletError.Camera.Broken',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CAMERA,
  },
  INVALID_QR_CODE: {
    code: 2001,
    alertEvent: AlertEvent.INVALID_QR_CODE,
    titleKey: 'BCWalletError.Camera.Title',
    descriptionKey: 'BCWalletError.Camera.InvalidQRCode',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CAMERA,
  },

  // ============================================
  // Network Errors (2100-2199)
  // ============================================
  NO_INTERNET: {
    code: 2100,
    alertEvent: AlertEvent.NO_INTERNET,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.NoInternet',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  SERVER_ERROR: {
    code: 2101,
    alertEvent: AlertEvent.SERVER_ERROR,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.ServerError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  SERVER_TIMEOUT: {
    code: 2102,
    alertEvent: AlertEvent.SERVER_TIMEOUT,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.Timeout',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  UNSECURED_NETWORK: {
    code: 2103,
    alertEvent: AlertEvent.UNSECURED_NETWORK,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.Unsecured',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.NETWORK,
  },
  PROBLEM_WITH_CONNECTION: {
    code: 2104,
    alertEvent: AlertEvent.PROBLEM_WITH_CONNECTION,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.ConnectionProblem',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  NETWORK_CALL_EXCEPTION: {
    code: 2105,
    alertEvent: AlertEvent.ERR_208_UNEXPECTED_NETWORK_CALL_EXCEPTION,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.UnexpectedError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  EMPTY_RESPONSE: {
    code: 2106,
    alertEvent: AlertEvent.ERR_300_EMPTY_RESPONSE,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.EmptyResponse',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  BAD_REQUEST: {
    code: 2107,
    alertEvent: AlertEvent.ERR_209_BAD_REQUEST,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.BadRequest',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  SERVER_OUTAGE: {
    code: 2108,
    alertEvent: AlertEvent.ERR_211_SERVER_OUTAGE,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.ServerOutage',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.NETWORK,
  },
  RETRY_LATER: {
    code: 2109,
    alertEvent: AlertEvent.ERR_212_RETRY_LATER,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.RetryLater',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.NETWORK,
  },
  INVALID_URL: {
    code: 2110,
    alertEvent: AlertEvent.ERR_500_INVALID_URL,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.InvalidURL',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },

  // ============================================
  // Authentication/Login Errors (2200-2299)
  // ============================================
  LOGIN_PARSE_URI: {
    code: 2200,
    alertEvent: AlertEvent.LOGIN_PARSE_URI,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.ParseError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_REJECTED_400: {
    code: 2201,
    alertEvent: AlertEvent.LOGIN_REJECTED_400,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.Rejected',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_REJECTED_401: {
    code: 2202,
    alertEvent: AlertEvent.LOGIN_REJECTED_401,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.Unauthorized',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_REJECTED_403: {
    code: 2203,
    alertEvent: AlertEvent.LOGIN_REJECTED_403,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.Forbidden',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_SERVER_ERROR: {
    code: 2204,
    alertEvent: AlertEvent.LOGIN_SERVER_ERROR,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.ServerError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  INVALID_PAIRING_CODE: {
    code: 2205,
    alertEvent: AlertEvent.INVALID_PAIRING_CODE,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.InvalidPairingCode',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING: {
    code: 2206,
    alertEvent: AlertEvent.LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING_CODE,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.InvalidPairingCode',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_SAME_DEVICE_INVALID_PAIRING: {
    code: 2207,
    alertEvent: AlertEvent.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.InvalidPairingCode',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },
  UNAUTHORIZED: {
    code: 2208,
    alertEvent: AlertEvent.ERR_210_UNAUTHORIZED,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.Unauthorized',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  TOO_MANY_ATTEMPTS: {
    code: 2209,
    alertEvent: AlertEvent.TOO_MANY_ATTEMPTS,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.TooManyAttempts',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },
  TOO_MANY_ACTIVE_ACCOUNTS: {
    code: 2210,
    alertEvent: AlertEvent.TOO_MANY_ACTIVE_ACCOUNTS,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.TooManyAccounts',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },

  // ============================================
  // Credential/Card Errors (2300-2399)
  // ============================================
  CARD_EXPIRED_WILL_REMOVE: {
    code: 2300,
    alertEvent: AlertEvent.CARD_EXPIRED_WILL_REMOVE,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.ExpiredWillRemove',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
  },
  CARD_STATUS_CANCELLED: {
    code: 2301,
    alertEvent: AlertEvent.CARD_STATUS_CANCELLED,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.Cancelled',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
  },
  CARD_STATUS_EXPIRED: {
    code: 2302,
    alertEvent: AlertEvent.CARD_STATUS_EXPIRED,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.Expired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
  },
  CARD_STATUS_REMOVED: {
    code: 2303,
    alertEvent: AlertEvent.CARD_STATUS_REMOVED,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.Removed',
    severity: ErrorSeverity.INFO,
    category: ErrorCategory.CREDENTIAL,
  },
  CARD_TYPE_CHANGED: {
    code: 2304,
    alertEvent: AlertEvent.CARD_TYPE_CHANGED,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.TypeChanged',
    severity: ErrorSeverity.INFO,
    category: ErrorCategory.CREDENTIAL,
  },
  CREDENTIAL_NULL: {
    code: 2305,
    alertEvent: AlertEvent.ERR_104_CREDENTIAL_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.NotFound',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CREDENTIAL,
  },
  PHYSICAL_CARD_WILL_EXPIRE: {
    code: 2306,
    alertEvent: AlertEvent.PHYSICAL_CARD_WILL_EXPIRE,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.WillExpire',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
  },

  // ============================================
  // Verification Errors (2400-2499)
  // ============================================
  VERIFY_NOT_COMPLETE: {
    code: 2400,
    alertEvent: AlertEvent.VERIFY_NOT_COMPLETE,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.NotComplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
  },
  VERIFY_STEPS_INCOMPLETE: {
    code: 2401,
    alertEvent: AlertEvent.VERIFY_STEPS_INCOMPLETE,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.StepsIncomplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
  },
  EVIDENCE_UPLOAD_SERVER_ERROR: {
    code: 2402,
    alertEvent: AlertEvent.EVIDENCE_UPLOAD_SERVER_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.UploadServerError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  EVIDENCE_UPLOAD_UNKNOWN_ERROR: {
    code: 2403,
    alertEvent: AlertEvent.EVIDENCE_UPLOAD_UNKNOWN_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.UploadUnknownError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  FILE_UPLOAD_ERROR: {
    code: 2404,
    alertEvent: AlertEvent.FILE_UPLOAD_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.FileUploadError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  VIDEO_VERIFY_NOT_COMPLETE: {
    code: 2405,
    alertEvent: AlertEvent.VIDEO_VERIFY_NOT_COMPLETE,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.VideoNotComplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
  },
  VIDEO_CAPTURE_ERROR: {
    code: 2406,
    alertEvent: AlertEvent.ERR_116_VIDEO_CAPTURE_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.VideoCaptureError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  INCOMPLETE_REMOTE_VERIFICATION: {
    code: 2407,
    alertEvent: AlertEvent.INCOMPLETE_REMOTE_VERIFICATION,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.RemoteIncomplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
  },
  DELETE_VERIFY_REQUEST_ERROR: {
    code: 2408,
    alertEvent: AlertEvent.DELETE_VERIFY_REQUEST_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.DeleteRequestError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },

  // ============================================
  // Token/Crypto Errors (2500-2599)
  // ============================================
  INVALID_TOKEN: {
    code: 2500,
    alertEvent: AlertEvent.INVALID_TOKEN,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.Invalid',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  NO_TOKENS_RETURNED: {
    code: 2501,
    alertEvent: AlertEvent.NO_TOKENS_RETURNED,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.NoTokensReturned',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  TOKEN_NULL: {
    code: 2502,
    alertEvent: AlertEvent.ERR_119_TOKEN_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.Null',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  TOKEN_EXPIRY_ERROR: {
    code: 2503,
    alertEvent: AlertEvent.ERR_118_FAILED_TO_RETRIEVE_TOKEN_EXPIRY,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.ExpiryError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  DECRYPT_VERIFY_ID_TOKEN_ERROR: {
    code: 2504,
    alertEvent: AlertEvent.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.DecryptVerifyError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  DESERIALIZE_ID_TOKEN_ERROR: {
    code: 2505,
    alertEvent: AlertEvent.ERR_106_UNABLE_TO_DESERIALIZE_ID_TOKEN,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.DeserializeError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  PARSE_JWT_ERROR: {
    code: 2506,
    alertEvent: AlertEvent.ERR_107_UNABLE_TO_PARSE_JWT_TOKENS,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.ParseJWTError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  DECRYPT_JWE_ERROR: {
    code: 2507,
    alertEvent: AlertEvent.ERR_110_UNABLE_TO_DECRYPT_JWE,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.DecryptJWEError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  MISSING_JWK_ERROR: {
    code: 2508,
    alertEvent: AlertEvent.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.MissingJWK',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  JWS_VERIFICATION_FAILED: {
    code: 2509,
    alertEvent: AlertEvent.ERR_112_JWS_VERIFICATION_FAILED,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.JWSVerificationFailed',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  JOSE_EXCEPTION: {
    code: 2510,
    alertEvent: AlertEvent.ERR_113_UNABLE_TO_VERIFY_JOSE_EXCEPTION,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.JOSEException',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  CLAIMS_SET_ERROR: {
    code: 2511,
    alertEvent: AlertEvent.ERR_114_FAILED_TO_GET_CLAIMS_SET_AFTER_DECRYPT_AND_VERIFY,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.ClaimsSetError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  SIGN_CLAIMS_ERROR: {
    code: 2512,
    alertEvent: AlertEvent.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.SignClaimsError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  PARSE_JWS_ERROR: {
    code: 2513,
    alertEvent: AlertEvent.ERR_117_FAILED_TO_PARSE_JWS,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.ParseJWSError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  JWT_DEVICE_INFO_ERROR: {
    code: 2514,
    alertEvent: AlertEvent.ERR_120_JWT_DEVICE_INFO_ERROR,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.JWTDeviceInfoError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },

  // ============================================
  // Storage Errors (2600-2699)
  // ============================================
  STORAGE_WRITE_ERROR: {
    code: 2600,
    alertEvent: AlertEvent.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.WriteError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  STORAGE_READ_ERROR: {
    code: 2601,
    alertEvent: AlertEvent.ERR_101_FAILED_TO_READ_LOCAL_STORAGE,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.ReadError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  KEYCHAIN_KEY_EXISTS: {
    code: 2602,
    alertEvent: AlertEvent.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.KeychainKeyExists',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  KEYCHAIN_KEY_NOT_FOUND: {
    code: 2603,
    alertEvent: AlertEvent.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.KeychainKeyNotFound',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  KEYCHAIN_KEY_GENERATION_ERROR: {
    code: 2604,
    alertEvent: AlertEvent.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.KeychainGenerationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  DELETE_KEY_PAIR_ERROR: {
    code: 2605,
    alertEvent: AlertEvent.ERR_108_UNABLE_TO_DELETE_KEY_PAIR,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.DeleteKeyPairError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  KEYS_OUT_OF_SYNC: {
    code: 2606,
    alertEvent: AlertEvent.ERR_299_KEYS_OUT_OF_SYNC,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.KeysOutOfSync',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.STORAGE,
  },
  TOJSON_METHOD_FAILURE: {
    code: 2607,
    alertEvent: AlertEvent.ERR_120_TOJSON_METHOD_FAILURE,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.ToJSONFailure',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  TOJSONSTRING_METHOD_FAILURE: {
    code: 2608,
    alertEvent: AlertEvent.ERR_120_TOJSONSTRING_METHOD_FAILURE,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.ToJSONStringFailure',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },

  // ============================================
  // Device Errors (2700-2799)
  // ============================================
  ANDROID_APP_UPDATE_REQUIRED: {
    code: 2700,
    alertEvent: AlertEvent.ANDROID_APP_UPDATE_REQUIRED,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.AppUpdateRequired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
  },
  IOS_APP_UPDATE_REQUIRED: {
    code: 2701,
    alertEvent: AlertEvent.IOS_APP_UPDATE_REQUIRED,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.AppUpdateRequired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
  },
  ANDROID_DEVICE_PROTECTION_REQUIRED: {
    code: 2702,
    alertEvent: AlertEvent.ANDROID_DEVICE_PROTECTION_REQUIRED,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.ProtectionRequired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
  },
  IOS_DEVICE_PROTECTION_REQUIRED: {
    code: 2703,
    alertEvent: AlertEvent.IOS_DEVICE_PROTECTION_REQUIRED,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.ProtectionRequired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
  },
  CLOCK_SKEW_ERROR: {
    code: 2704,
    alertEvent: AlertEvent.CLOCK_SKEW_ERROR,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.ClockSkew',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },
  DEVICE_AUTHORIZATION_ERROR: {
    code: 2705,
    alertEvent: AlertEvent.DEVICE_AUTHORIZATION_ERROR,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.AuthorizationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },
  ADD_CARD_INCORRECT_OS: {
    code: 2706,
    alertEvent: AlertEvent.ADD_CARD_INCORRECT_OS,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.IncorrectOS',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },
  KEYPAIR_GENERATION_ERROR: {
    code: 2707,
    alertEvent: AlertEvent.ADD_CARD_KEYPAIR_GENERATION,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.KeypairGenerationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },

  // ============================================
  // General/Registration Errors (2800-2899)
  // ============================================
  GENERAL_ERROR: {
    code: 2800,
    alertEvent: AlertEvent.GENERAL,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.Unknown',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  DYNAMIC_REGISTRATION_ERROR: {
    code: 2801,
    alertEvent: AlertEvent.ADD_CARD_DYNAMIC_REGISTRATION,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.RegistrationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  APP_VERSION_NOT_SUPPORTED: {
    code: 2802,
    alertEvent: AlertEvent.ADD_CARD_DYNAMIC_REGISTRATION_APPVERSION_NOT_SUPPORTED,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.AppVersionNotSupported',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  CLIENT_REGISTRATION_NULL: {
    code: 2803,
    alertEvent: AlertEvent.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.RegistrationNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  AUTHORIZATION_REQUEST_NULL: {
    code: 2804,
    alertEvent: AlertEvent.ERR_103_AUTHORIZATION_REQUEST_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.AuthorizationNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  DESERIALIZE_JSON_ERROR: {
    code: 2805,
    alertEvent: AlertEvent.ERR_109_FAILED_TO_DESERIALIZE_JSON,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.DeserializeError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  SERIALIZE_JSON_ERROR: {
    code: 2806,
    alertEvent: AlertEvent.ERR_115_FAILED_TO_SERIALIZE_JSON,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.SerializeError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  PROVIDER_NULL: {
    code: 2807,
    alertEvent: AlertEvent.ERR_116_PROVIDER_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.ProviderNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  CLIENT_REGISTRATION_FAILURE: {
    code: 2808,
    alertEvent: AlertEvent.ERR_120_CLIENT_REGISTRATION_FAILURE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.RegistrationFailure',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  CREATING_CLIENT_REGISTRATION_FAILED: {
    code: 2809,
    alertEvent: AlertEvent.ERR_213_FAILED_CREATING_CLIENT_REGISTRATION,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.CreateRegistrationFailed',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  INVALID_REGISTRATION_REQUEST: {
    code: 2810,
    alertEvent: AlertEvent.ERR_501_INVALID_REGISTRATION_REQUEST,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.InvalidRegistration',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  MISSING_JSON_VALUES: {
    code: 2811,
    alertEvent: AlertEvent.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.MissingJSONValues',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  SERVER_CONFIGURATION_ERROR: {
    code: 2812,
    alertEvent: AlertEvent.ADD_CARD_SERVER_CONFIGURATION,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.ServerConfiguration',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  ADD_CARD_SERVER_ERROR: {
    code: 2813,
    alertEvent: AlertEvent.ADD_CARD_SERVER_ERROR,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.AddCardServerError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  PIN_STORE_ERROR: {
    code: 2814,
    alertEvent: AlertEvent.ADD_CARD_PIN_STORE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.PINStoreError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  PROVIDER_ERROR: {
    code: 2815,
    alertEvent: AlertEvent.ADD_CARD_PROVIDER,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.ProviderError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  FETCHED_PROVIDER_NULL: {
    code: 2816,
    alertEvent: AlertEvent.ERR_221_FETCHED_PROVIDER_NULL_EXCEPTION,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.FetchedProviderNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  TERMS_OF_USE_ERROR: {
    code: 2817,
    alertEvent: AlertEvent.ADD_CARD_TERMS_OF_USE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.TermsOfUseError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  VALID_CREDENTIAL_EMPTY_KEYCHAIN: {
    code: 2818,
    alertEvent: AlertEvent.VALID_CREDENTIAL_EMPTY_KEYCHAIN,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.EmptyKeychain',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  APP_SETUP_NOT_COMPLETE: {
    code: 2819,
    alertEvent: AlertEvent.APP_SETUP_NOT_COMPLETE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.SetupNotComplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.GENERAL,
  },
  FAILED_TO_RETRIEVE_STRING_RESOURCE: {
    code: 2820,
    alertEvent: AlertEvent.ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.StringResourceError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  VIDEO_SERVICE_HOURS_NULL: {
    code: 2821,
    alertEvent: AlertEvent.ERR_115_VIDEO_SERVICE_HOURS_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.VideoServiceHoursNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },

  // ============================================
  // Wallet/Agent Errors (2900-2999)
  // ============================================
  STATE_LOAD_ERROR: {
    code: 2900,
    alertEvent: AlertEvent.STATE_LOAD_ERROR,
    titleKey: 'BCWalletError.Wallet.Title',
    descriptionKey: 'BCWalletError.Wallet.StateLoadError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.WALLET,
  },
  AGENT_INITIALIZATION_ERROR: {
    code: 2901,
    alertEvent: AlertEvent.AGENT_INITIALIZATION_ERROR,
    titleKey: 'BCWalletError.Wallet.Title',
    descriptionKey: 'BCWalletError.Wallet.AgentInitError',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.WALLET,
  },
  WALLET_SECRET_NOT_FOUND: {
    code: 2902,
    alertEvent: AlertEvent.WALLET_SECRET_NOT_FOUND,
    titleKey: 'BCWalletError.Wallet.Title',
    descriptionKey: 'BCWalletError.Wallet.SecretNotFound',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.WALLET,
  },

  // ============================================
  // Connection/BCID Errors (3000-3099)
  // ============================================
  PARSE_INVITATION_ERROR: {
    code: 3000,
    alertEvent: AlertEvent.PARSE_INVITATION_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.ParseInvitationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },
  RECEIVE_INVITATION_ERROR: {
    code: 3001,
    alertEvent: AlertEvent.RECEIVE_INVITATION_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.ReceiveInvitationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },
  LEGACY_DID_ERROR: {
    code: 3002,
    alertEvent: AlertEvent.LEGACY_DID_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.LegacyDIDError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },
  APP_TO_APP_URL_ERROR: {
    code: 3003,
    alertEvent: AlertEvent.APP_TO_APP_URL_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.AppToAppURLError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },
  SERVICE_CARD_AUTH_ERROR: {
    code: 3004,
    alertEvent: AlertEvent.SERVICE_CARD_AUTH_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.ServiceCardAuthError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },

  // ============================================
  // Attestation Errors (3100-3199)
  // ============================================
  ATTESTATION_BAD_INVITATION: {
    code: 3100,
    alertEvent: AlertEvent.ATTESTATION_BAD_INVITATION,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.BadInvitation',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_CONNECTION_ERROR: {
    code: 3101,
    alertEvent: AlertEvent.ATTESTATION_CONNECTION_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.ConnectionError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_NONCE_ERROR: {
    code: 3102,
    alertEvent: AlertEvent.ATTESTATION_NONCE_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.NonceError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_GENERATION_ERROR: {
    code: 3103,
    alertEvent: AlertEvent.ATTESTATION_GENERATION_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.GenerationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_VALIDATION_ERROR: {
    code: 3104,
    alertEvent: AlertEvent.ATTESTATION_VALIDATION_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.ValidationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_AGENT_UNDEFINED: {
    code: 3105,
    alertEvent: AlertEvent.ATTESTATION_AGENT_UNDEFINED,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.AgentUndefined',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_INTEGRITY_UNAVAILABLE: {
    code: 3106,
    alertEvent: AlertEvent.ATTESTATION_INTEGRITY_UNAVAILABLE,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.IntegrityUnavailable',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_GENERAL_PROOF_ERROR: {
    code: 3107,
    alertEvent: AlertEvent.ATTESTATION_GENERAL_PROOF_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.GeneralProofError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_REQUEST_ERROR: {
    code: 3108,
    alertEvent: AlertEvent.ATTESTATION_REQUEST_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.RequestError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_UNSUPPORTED_PLATFORM: {
    code: 3109,
    alertEvent: AlertEvent.ATTESTATION_UNSUPPORTED_PLATFORM,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.UnsupportedPlatform',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },
} as const

export type ErrorRegistryKey = keyof typeof ErrorRegistry
