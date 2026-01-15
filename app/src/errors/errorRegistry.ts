import { AppEventCode } from '../events/appEventCode'

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
  /** Unique error status code (for support reference) */
  statusCode: number
  /** App event statusCode */
  appEvent: AppEventCode
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
    statusCode: 2000,
    appEvent: AppEventCode.ADD_CARD_CAMERA_BROKEN,
    titleKey: 'BCWalletError.Camera.Title',
    descriptionKey: 'BCWalletError.Camera.Broken',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CAMERA,
  },
  INVALID_QR_CODE: {
    statusCode: 2001,
    appEvent: AppEventCode.INVALID_QR_CODE,
    titleKey: 'BCWalletError.Camera.Title',
    descriptionKey: 'BCWalletError.Camera.InvalidQRCode',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CAMERA,
  },

  // ============================================
  // Network Errors (2100-2199)
  // ============================================
  NO_INTERNET: {
    statusCode: 2100,
    appEvent: AppEventCode.NO_INTERNET,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.NoInternet',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  SERVER_ERROR: {
    statusCode: 2101,
    appEvent: AppEventCode.SERVER_ERROR,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.ServerError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  SERVER_TIMEOUT: {
    statusCode: 2102,
    appEvent: AppEventCode.SERVER_TIMEOUT,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.Timeout',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  UNSECURED_NETWORK: {
    statusCode: 2103,
    appEvent: AppEventCode.UNSECURED_NETWORK,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.Unsecured',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.NETWORK,
  },
  PROBLEM_WITH_CONNECTION: {
    statusCode: 2104,
    appEvent: AppEventCode.PROBLEM_WITH_CONNECTION,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.ConnectionProblem',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  NETWORK_CALL_EXCEPTION: {
    statusCode: 2105,
    appEvent: AppEventCode.ERR_208_UNEXPECTED_NETWORK_CALL_EXCEPTION,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.UnexpectedError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  EMPTY_RESPONSE: {
    statusCode: 2106,
    appEvent: AppEventCode.ERR_300_EMPTY_RESPONSE,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.EmptyResponse',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  BAD_REQUEST: {
    statusCode: 2107,
    appEvent: AppEventCode.ERR_209_BAD_REQUEST,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.BadRequest',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },
  SERVER_OUTAGE: {
    statusCode: 2108,
    appEvent: AppEventCode.ERR_211_SERVER_OUTAGE,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.ServerOutage',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.NETWORK,
  },
  RETRY_LATER: {
    statusCode: 2109,
    appEvent: AppEventCode.ERR_212_RETRY_LATER,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.RetryLater',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.NETWORK,
  },
  INVALID_URL: {
    statusCode: 2110,
    appEvent: AppEventCode.ERR_500_INVALID_URL,
    titleKey: 'BCWalletError.Network.Title',
    descriptionKey: 'BCWalletError.Network.InvalidURL',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
  },

  // ============================================
  // Authentication/Login Errors (2200-2299)
  // ============================================
  LOGIN_PARSE_URI: {
    statusCode: 2200,
    appEvent: AppEventCode.LOGIN_PARSE_URI,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.ParseError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_REJECTED_400: {
    statusCode: 2201,
    appEvent: AppEventCode.LOGIN_REJECTED_400,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.Rejected',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_REJECTED_401: {
    statusCode: 2202,
    appEvent: AppEventCode.LOGIN_REJECTED_401,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.Unauthorized',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_REJECTED_403: {
    statusCode: 2203,
    appEvent: AppEventCode.LOGIN_REJECTED_403,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.Forbidden',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_SERVER_ERROR: {
    statusCode: 2204,
    appEvent: AppEventCode.LOGIN_SERVER_ERROR,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.ServerError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  INVALID_PAIRING_CODE: {
    statusCode: 2205,
    appEvent: AppEventCode.INVALID_PAIRING_CODE,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.InvalidPairingCode',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING: {
    statusCode: 2206,
    appEvent: AppEventCode.LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING_CODE,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.InvalidPairingCode',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },
  LOGIN_SAME_DEVICE_INVALID_PAIRING: {
    statusCode: 2207,
    appEvent: AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.InvalidPairingCode',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },
  UNAUTHORIZED: {
    statusCode: 2208,
    appEvent: AppEventCode.ERR_210_UNAUTHORIZED,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.Unauthorized',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
  },
  TOO_MANY_ATTEMPTS: {
    statusCode: 2209,
    appEvent: AppEventCode.TOO_MANY_ATTEMPTS,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.TooManyAttempts',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },
  TOO_MANY_ACTIVE_ACCOUNTS: {
    statusCode: 2210,
    appEvent: AppEventCode.TOO_MANY_ACTIVE_ACCOUNTS,
    titleKey: 'BCWalletError.Login.Title',
    descriptionKey: 'BCWalletError.Login.TooManyAccounts',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
  },

  // ============================================
  // Credential/Card Errors (2300-2399)
  // ============================================
  CARD_EXPIRED_WILL_REMOVE: {
    statusCode: 2300,
    appEvent: AppEventCode.CARD_EXPIRED_WILL_REMOVE,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.ExpiredWillRemove',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
  },
  CARD_STATUS_CANCELLED: {
    statusCode: 2301,
    appEvent: AppEventCode.CARD_STATUS_CANCELLED,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.Cancelled',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
  },
  CARD_STATUS_EXPIRED: {
    statusCode: 2302,
    appEvent: AppEventCode.CARD_STATUS_EXPIRED,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.Expired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
  },
  CARD_STATUS_REMOVED: {
    statusCode: 2303,
    appEvent: AppEventCode.CARD_STATUS_REMOVED,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.Removed',
    severity: ErrorSeverity.INFO,
    category: ErrorCategory.CREDENTIAL,
  },
  CARD_TYPE_CHANGED: {
    statusCode: 2304,
    appEvent: AppEventCode.CARD_TYPE_CHANGED,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.TypeChanged',
    severity: ErrorSeverity.INFO,
    category: ErrorCategory.CREDENTIAL,
  },
  CREDENTIAL_NULL: {
    statusCode: 2305,
    appEvent: AppEventCode.ERR_104_CREDENTIAL_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.NotFound',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CREDENTIAL,
  },
  PHYSICAL_CARD_WILL_EXPIRE: {
    statusCode: 2306,
    appEvent: AppEventCode.PHYSICAL_CARD_WILL_EXPIRE,
    titleKey: 'BCWalletError.Card.Title',
    descriptionKey: 'BCWalletError.Card.WillExpire',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
  },

  // ============================================
  // Verification Errors (2400-2499)
  // ============================================
  VERIFY_NOT_COMPLETE: {
    statusCode: 2400,
    appEvent: AppEventCode.VERIFY_NOT_COMPLETE,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.NotComplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
  },
  VERIFY_STEPS_INCOMPLETE: {
    statusCode: 2401,
    appEvent: AppEventCode.VERIFY_STEPS_INCOMPLETE,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.StepsIncomplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
  },
  EVIDENCE_UPLOAD_SERVER_ERROR: {
    statusCode: 2402,
    appEvent: AppEventCode.EVIDENCE_UPLOAD_SERVER_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.UploadServerError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  EVIDENCE_UPLOAD_UNKNOWN_ERROR: {
    statusCode: 2403,
    appEvent: AppEventCode.EVIDENCE_UPLOAD_UNKNOWN_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.UploadUnknownError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  FILE_UPLOAD_ERROR: {
    statusCode: 2404,
    appEvent: AppEventCode.FILE_UPLOAD_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.FileUploadError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  VIDEO_VERIFY_NOT_COMPLETE: {
    statusCode: 2405,
    appEvent: AppEventCode.VIDEO_VERIFY_NOT_COMPLETE,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.VideoNotComplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
  },
  VIDEO_CAPTURE_ERROR: {
    statusCode: 2406,
    appEvent: AppEventCode.ERR_116_VIDEO_CAPTURE_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.VideoCaptureError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  INCOMPLETE_REMOTE_VERIFICATION: {
    statusCode: 2407,
    appEvent: AppEventCode.INCOMPLETE_REMOTE_VERIFICATION,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.RemoteIncomplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
  },
  DELETE_VERIFY_REQUEST_ERROR: {
    statusCode: 2408,
    appEvent: AppEventCode.DELETE_VERIFY_REQUEST_ERROR,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.DeleteRequestError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },

  // ============================================
  // Token/Crypto Errors (2500-2599)
  // ============================================
  INVALID_TOKEN: {
    statusCode: 2500,
    appEvent: AppEventCode.INVALID_TOKEN,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.Invalid',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  NO_TOKENS_RETURNED: {
    statusCode: 2501,
    appEvent: AppEventCode.NO_TOKENS_RETURNED,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.NoTokensReturned',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  TOKEN_NULL: {
    statusCode: 2502,
    appEvent: AppEventCode.ERR_119_TOKEN_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.Null',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  TOKEN_EXPIRY_ERROR: {
    statusCode: 2503,
    appEvent: AppEventCode.ERR_118_FAILED_TO_RETRIEVE_TOKEN_EXPIRY,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.ExpiryError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  DECRYPT_VERIFY_ID_TOKEN_ERROR: {
    statusCode: 2504,
    appEvent: AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.DecryptVerifyError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  DESERIALIZE_ID_TOKEN_ERROR: {
    statusCode: 2505,
    appEvent: AppEventCode.ERR_106_UNABLE_TO_DESERIALIZE_ID_TOKEN,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.DeserializeError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  PARSE_JWT_ERROR: {
    statusCode: 2506,
    appEvent: AppEventCode.ERR_107_UNABLE_TO_PARSE_JWT_TOKENS,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.ParseJWTError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  DECRYPT_JWE_ERROR: {
    statusCode: 2507,
    appEvent: AppEventCode.ERR_110_UNABLE_TO_DECRYPT_JWE,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.DecryptJWEError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  MISSING_JWK_ERROR: {
    statusCode: 2508,
    appEvent: AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.MissingJWK',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  JWS_VERIFICATION_FAILED: {
    statusCode: 2509,
    appEvent: AppEventCode.ERR_112_JWS_VERIFICATION_FAILED,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.JWSVerificationFailed',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  JOSE_EXCEPTION: {
    statusCode: 2510,
    appEvent: AppEventCode.ERR_113_UNABLE_TO_VERIFY_JOSE_EXCEPTION,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.JOSEException',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  CLAIMS_SET_ERROR: {
    statusCode: 2511,
    appEvent: AppEventCode.ERR_114_FAILED_TO_GET_CLAIMS_SET_AFTER_DECRYPT_AND_VERIFY,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.ClaimsSetError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  SIGN_CLAIMS_ERROR: {
    statusCode: 2512,
    appEvent: AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.SignClaimsError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  PARSE_JWS_ERROR: {
    statusCode: 2513,
    appEvent: AppEventCode.ERR_117_FAILED_TO_PARSE_JWS,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.ParseJWSError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },
  JWT_DEVICE_INFO_ERROR: {
    statusCode: 2514,
    appEvent: AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR,
    titleKey: 'BCWalletError.Token.Title',
    descriptionKey: 'BCWalletError.Token.JWTDeviceInfoError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
  },

  // ============================================
  // Storage Errors (2600-2699)
  // ============================================
  STORAGE_WRITE_ERROR: {
    statusCode: 2600,
    appEvent: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.WriteError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  STORAGE_READ_ERROR: {
    statusCode: 2601,
    appEvent: AppEventCode.ERR_101_FAILED_TO_READ_LOCAL_STORAGE,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.ReadError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  KEYCHAIN_KEY_EXISTS: {
    statusCode: 2602,
    appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.KeychainKeyExists',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  KEYCHAIN_KEY_NOT_FOUND: {
    statusCode: 2603,
    appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.KeychainKeyNotFound',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  KEYCHAIN_KEY_GENERATION_ERROR: {
    statusCode: 2604,
    appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.KeychainGenerationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  DELETE_KEY_PAIR_ERROR: {
    statusCode: 2605,
    appEvent: AppEventCode.ERR_108_UNABLE_TO_DELETE_KEY_PAIR,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.DeleteKeyPairError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  KEYS_OUT_OF_SYNC: {
    statusCode: 2606,
    appEvent: AppEventCode.ERR_299_KEYS_OUT_OF_SYNC,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.KeysOutOfSync',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.STORAGE,
  },
  TOJSON_METHOD_FAILURE: {
    statusCode: 2607,
    appEvent: AppEventCode.ERR_120_TOJSON_METHOD_FAILURE,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.ToJSONFailure',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },
  TOJSONSTRING_METHOD_FAILURE: {
    statusCode: 2608,
    appEvent: AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE,
    titleKey: 'BCWalletError.Storage.Title',
    descriptionKey: 'BCWalletError.Storage.ToJSONStringFailure',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
  },

  // ============================================
  // Device Errors (2700-2799)
  // ============================================
  ANDROID_APP_UPDATE_REQUIRED: {
    statusCode: 2700,
    appEvent: AppEventCode.ANDROID_APP_UPDATE_REQUIRED,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.AppUpdateRequired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
  },
  IOS_APP_UPDATE_REQUIRED: {
    statusCode: 2701,
    appEvent: AppEventCode.IOS_APP_UPDATE_REQUIRED,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.AppUpdateRequired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
  },
  ANDROID_DEVICE_PROTECTION_REQUIRED: {
    statusCode: 2702,
    appEvent: AppEventCode.ANDROID_DEVICE_PROTECTION_REQUIRED,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.ProtectionRequired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
  },
  IOS_DEVICE_PROTECTION_REQUIRED: {
    statusCode: 2703,
    appEvent: AppEventCode.IOS_DEVICE_PROTECTION_REQUIRED,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.ProtectionRequired',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
  },
  CLOCK_SKEW_ERROR: {
    statusCode: 2704,
    appEvent: AppEventCode.CLOCK_SKEW_ERROR,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.ClockSkew',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },
  DEVICE_AUTHORIZATION_ERROR: {
    statusCode: 2705,
    appEvent: AppEventCode.DEVICE_AUTHORIZATION_ERROR,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.AuthorizationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },
  ADD_CARD_INCORRECT_OS: {
    statusCode: 2706,
    appEvent: AppEventCode.ADD_CARD_INCORRECT_OS,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.IncorrectOS',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },
  KEYPAIR_GENERATION_ERROR: {
    statusCode: 2707,
    appEvent: AppEventCode.ADD_CARD_KEYPAIR_GENERATION,
    titleKey: 'BCWalletError.Device.Title',
    descriptionKey: 'BCWalletError.Device.KeypairGenerationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },

  // ============================================
  // General/Registration Errors (2800-2899)
  // ============================================
  GENERAL_ERROR: {
    statusCode: 2800,
    appEvent: AppEventCode.GENERAL,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.Unknown',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  DYNAMIC_REGISTRATION_ERROR: {
    statusCode: 2801,
    appEvent: AppEventCode.ADD_CARD_DYNAMIC_REGISTRATION,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.RegistrationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  APP_VERSION_NOT_SUPPORTED: {
    statusCode: 2802,
    appEvent: AppEventCode.ADD_CARD_DYNAMIC_REGISTRATION_APPVERSION_NOT_SUPPORTED,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.AppVersionNotSupported',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  CLIENT_REGISTRATION_NULL: {
    statusCode: 2803,
    appEvent: AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.RegistrationNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  AUTHORIZATION_REQUEST_NULL: {
    statusCode: 2804,
    appEvent: AppEventCode.ERR_103_AUTHORIZATION_REQUEST_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.AuthorizationNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  DESERIALIZE_JSON_ERROR: {
    statusCode: 2805,
    appEvent: AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.DeserializeError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  SERIALIZE_JSON_ERROR: {
    statusCode: 2806,
    appEvent: AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.SerializeError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  PROVIDER_NULL: {
    statusCode: 2807,
    appEvent: AppEventCode.ERR_116_PROVIDER_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.ProviderNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  CLIENT_REGISTRATION_FAILURE: {
    statusCode: 2808,
    appEvent: AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.RegistrationFailure',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  CREATING_CLIENT_REGISTRATION_FAILED: {
    statusCode: 2809,
    appEvent: AppEventCode.ERR_213_FAILED_CREATING_CLIENT_REGISTRATION,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.CreateRegistrationFailed',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  INVALID_REGISTRATION_REQUEST: {
    statusCode: 2810,
    appEvent: AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.InvalidRegistration',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  MISSING_JSON_VALUES: {
    statusCode: 2811,
    appEvent: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.MissingJSONValues',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  SERVER_CONFIGURATION_ERROR: {
    statusCode: 2812,
    appEvent: AppEventCode.ADD_CARD_SERVER_CONFIGURATION,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.ServerConfiguration',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  ADD_CARD_SERVER_ERROR: {
    statusCode: 2813,
    appEvent: AppEventCode.ADD_CARD_SERVER_ERROR,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.AddCardServerError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  PIN_STORE_ERROR: {
    statusCode: 2814,
    appEvent: AppEventCode.ADD_CARD_PIN_STORE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.PINStoreError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  PROVIDER_ERROR: {
    statusCode: 2815,
    appEvent: AppEventCode.ADD_CARD_PROVIDER,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.ProviderError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  FETCHED_PROVIDER_NULL: {
    statusCode: 2816,
    appEvent: AppEventCode.ERR_221_FETCHED_PROVIDER_NULL_EXCEPTION,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.FetchedProviderNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  TERMS_OF_USE_ERROR: {
    statusCode: 2817,
    appEvent: AppEventCode.ADD_CARD_TERMS_OF_USE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.TermsOfUseError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  VALID_CREDENTIAL_EMPTY_KEYCHAIN: {
    statusCode: 2818,
    appEvent: AppEventCode.VALID_CREDENTIAL_EMPTY_KEYCHAIN,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.EmptyKeychain',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  APP_SETUP_NOT_COMPLETE: {
    statusCode: 2819,
    appEvent: AppEventCode.APP_SETUP_NOT_COMPLETE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.SetupNotComplete',
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.GENERAL,
  },
  FAILED_TO_RETRIEVE_STRING_RESOURCE: {
    statusCode: 2820,
    appEvent: AppEventCode.ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE,
    titleKey: 'BCWalletError.General.Title',
    descriptionKey: 'BCWalletError.General.StringResourceError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
  },
  VIDEO_SERVICE_HOURS_NULL: {
    statusCode: 2821,
    appEvent: AppEventCode.ERR_115_VIDEO_SERVICE_HOURS_UNEXPECTEDLY_NULL,
    titleKey: 'BCWalletError.Verification.Title',
    descriptionKey: 'BCWalletError.Verification.VideoServiceHoursNull',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },

  // ============================================
  // Wallet/Agent Errors (2900-2999)
  // ============================================
  STATE_LOAD_ERROR: {
    statusCode: 2900,
    appEvent: AppEventCode.STATE_LOAD_ERROR,
    titleKey: 'BCWalletError.Wallet.Title',
    descriptionKey: 'BCWalletError.Wallet.StateLoadError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.WALLET,
  },
  AGENT_INITIALIZATION_ERROR: {
    statusCode: 2901,
    appEvent: AppEventCode.AGENT_INITIALIZATION_ERROR,
    titleKey: 'BCWalletError.Wallet.Title',
    descriptionKey: 'BCWalletError.Wallet.AgentInitError',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.WALLET,
  },
  WALLET_SECRET_NOT_FOUND: {
    statusCode: 2902,
    appEvent: AppEventCode.WALLET_SECRET_NOT_FOUND,
    titleKey: 'BCWalletError.Wallet.Title',
    descriptionKey: 'BCWalletError.Wallet.SecretNotFound',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.WALLET,
  },

  // ============================================
  // Connection/BCID Errors (3000-3099)
  // ============================================
  PARSE_INVITATION_ERROR: {
    statusCode: 3000,
    appEvent: AppEventCode.PARSE_INVITATION_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.ParseInvitationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },
  RECEIVE_INVITATION_ERROR: {
    statusCode: 3001,
    appEvent: AppEventCode.RECEIVE_INVITATION_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.ReceiveInvitationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },
  LEGACY_DID_ERROR: {
    statusCode: 3002,
    appEvent: AppEventCode.LEGACY_DID_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.LegacyDIDError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },
  APP_TO_APP_URL_ERROR: {
    statusCode: 3003,
    appEvent: AppEventCode.APP_TO_APP_URL_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.AppToAppURLError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },
  SERVICE_CARD_AUTH_ERROR: {
    statusCode: 3004,
    appEvent: AppEventCode.SERVICE_CARD_AUTH_ERROR,
    titleKey: 'BCWalletError.Connection.Title',
    descriptionKey: 'BCWalletError.Connection.ServiceCardAuthError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
  },

  // ============================================
  // Attestation Errors (3100-3199)
  // ============================================
  ATTESTATION_BAD_INVITATION: {
    statusCode: 3100,
    appEvent: AppEventCode.ATTESTATION_BAD_INVITATION,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.BadInvitation',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_CONNECTION_ERROR: {
    statusCode: 3101,
    appEvent: AppEventCode.ATTESTATION_CONNECTION_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.ConnectionError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_NONCE_ERROR: {
    statusCode: 3102,
    appEvent: AppEventCode.ATTESTATION_NONCE_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.NonceError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_GENERATION_ERROR: {
    statusCode: 3103,
    appEvent: AppEventCode.ATTESTATION_GENERATION_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.GenerationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_VALIDATION_ERROR: {
    statusCode: 3104,
    appEvent: AppEventCode.ATTESTATION_VALIDATION_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.ValidationError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_AGENT_UNDEFINED: {
    statusCode: 3105,
    appEvent: AppEventCode.ATTESTATION_AGENT_UNDEFINED,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.AgentUndefined',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_INTEGRITY_UNAVAILABLE: {
    statusCode: 3106,
    appEvent: AppEventCode.ATTESTATION_INTEGRITY_UNAVAILABLE,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.IntegrityUnavailable',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_GENERAL_PROOF_ERROR: {
    statusCode: 3107,
    appEvent: AppEventCode.ATTESTATION_GENERAL_PROOF_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.GeneralProofError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_REQUEST_ERROR: {
    statusCode: 3108,
    appEvent: AppEventCode.ATTESTATION_REQUEST_ERROR,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.RequestError',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
  },
  ATTESTATION_UNSUPPORTED_PLATFORM: {
    statusCode: 3109,
    appEvent: AppEventCode.ATTESTATION_UNSUPPORTED_PLATFORM,
    titleKey: 'BCWalletError.Attestation.Title',
    descriptionKey: 'BCWalletError.Attestation.UnsupportedPlatform',
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
  },
} as const

export type ErrorRegistryKey = keyof typeof ErrorRegistry
