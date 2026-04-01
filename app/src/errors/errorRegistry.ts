import { FATAL_UNRECOVERABLE_ERROR_STATUS_CODE, UNKNOWN_APP_ERROR_STATUS_CODE } from '@/constants'
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
  UNKNOWN = 'unknown',
}

/**
 * Error definition containing all metadata for an error type
 */
export interface ErrorDefinition {
  /** Unique error status code (for support reference) */
  statusCode: number
  /** App event code */
  appEvent: AppEventCode
  /** Error severity */
  severity: ErrorSeverity
  /** Error category */
  category: ErrorCategory
  /** Human-readable error message */
  message: string
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
 *
 * Special codes:
 *   9999: Reserved for unknown/unmapped errors
 *   9998: Reserved for fatal unrecoverable errors
 */
export const ErrorRegistry = {
  // ============================================
  // Special Errors
  // ===========================================
  UNKNOWN_ERROR: {
    statusCode: UNKNOWN_APP_ERROR_STATUS_CODE, // 9999
    appEvent: AppEventCode.UNKNOWN_APP_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.UNKNOWN,
    message: 'An unknown error occurred',
  },
  FATAL_ERROR: {
    statusCode: FATAL_UNRECOVERABLE_ERROR_STATUS_CODE, // 9998
    appEvent: AppEventCode.FATAL_UNRECOVERABLE_ERROR,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.UNKNOWN,
    message: 'A fatal error occurred — app functionality may be compromised',
  },

  // ============================================
  // Camera/Scanning Errors (2000-2099)
  // ============================================
  CAMERA_BROKEN: {
    statusCode: 2000,
    appEvent: AppEventCode.ADD_CARD_CAMERA_BROKEN,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CAMERA,
    message: 'Camera hardware unavailable or failed to initialize',
  },
  INVALID_QR_CODE: {
    statusCode: 2001,
    appEvent: AppEventCode.INVALID_QR_CODE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CAMERA,
    message: 'Scanned QR code could not be parsed or contains invalid data',
  },

  // ============================================
  // Network Errors (2100-2199)
  // ============================================
  NO_INTERNET: {
    statusCode: 2100,
    appEvent: AppEventCode.NO_INTERNET,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'Network reachability check failed — no active internet connection',
  },
  SERVER_ERROR: {
    statusCode: 2101,
    appEvent: AppEventCode.SERVER_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'Server returned a 5xx response',
  },
  SERVER_TIMEOUT: {
    statusCode: 2102,
    appEvent: AppEventCode.SERVER_TIMEOUT,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'HTTP request exceeded timeout threshold — no response received',
  },
  UNSECURED_NETWORK: {
    statusCode: 2103,
    appEvent: AppEventCode.UNSECURED_NETWORK,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.NETWORK,
    message: 'TLS/SSL validation failed — connection is not secure',
  },
  PROBLEM_WITH_CONNECTION: {
    statusCode: 2104,
    appEvent: AppEventCode.PROBLEM_WITH_CONNECTION,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'Network connection dropped or reset during request',
  },
  NETWORK_CALL_EXCEPTION: {
    statusCode: 2105,
    appEvent: AppEventCode.ERR_208_UNEXPECTED_NETWORK_CALL_EXCEPTION,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'Unhandled exception thrown during network call',
  },
  EMPTY_RESPONSE: {
    statusCode: 2106,
    appEvent: AppEventCode.ERR_300_EMPTY_RESPONSE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'Server returned a 200 with an empty or null response body',
  },
  BAD_REQUEST: {
    statusCode: 2107,
    appEvent: AppEventCode.ERR_209_BAD_REQUEST,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'Server rejected the request with HTTP 400 — check request payload',
  },
  SERVER_OUTAGE: {
    statusCode: 2108,
    appEvent: AppEventCode.ERR_211_SERVER_OUTAGE,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.NETWORK,
    message: 'Server returned 503 — service is down or undergoing maintenance',
  },
  RETRY_LATER: {
    statusCode: 2109,
    appEvent: AppEventCode.ERR_212_RETRY_LATER,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.NETWORK,
    message: 'Server returned 429 or retry-after — rate limited or temporarily unavailable',
  },
  INVALID_URL: {
    statusCode: 2110,
    appEvent: AppEventCode.ERR_500_INVALID_URL,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'URL failed validation — malformed or unsupported scheme',
  },
  UNKNOWN_SERVER_ERROR: {
    statusCode: 2111,
    appEvent: AppEventCode.UNKNOWN_SERVER_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.NETWORK,
    message: 'Server returned an unrecognized error response — could not map to a known error code',
  },
  TOO_MANY_ATTEMPTS: {
    statusCode: 2112,
    appEvent: AppEventCode.TOO_MANY_ATTEMPTS,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Maximum retry/attempt count exceeded — request throttled',
  },

  // ============================================
  // Authentication/Login Errors (2200-2299)
  // ============================================
  LOGIN_PARSE_URI: {
    statusCode: 2200,
    appEvent: AppEventCode.LOGIN_PARSE_URI,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Login redirect URI could not be parsed — invalid format or missing parameters',
  },
  LOGIN_REJECTED_400: {
    statusCode: 2201,
    appEvent: AppEventCode.LOGIN_REJECTED_400,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Auth server returned HTTP 400 — login request rejected',
  },
  LOGIN_REJECTED_401: {
    statusCode: 2202,
    appEvent: AppEventCode.LOGIN_REJECTED_401,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Auth server returned HTTP 401 — invalid or expired credentials',
  },
  LOGIN_REJECTED_403: {
    statusCode: 2203,
    appEvent: AppEventCode.LOGIN_REJECTED_403,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Auth server returned HTTP 403 — user lacks permission',
  },
  LOGIN_SERVER_ERROR: {
    statusCode: 2204,
    appEvent: AppEventCode.LOGIN_SERVER_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Auth server returned 5xx during login flow',
  },
  INVALID_PAIRING_CODE: {
    statusCode: 2205,
    appEvent: AppEventCode.INVALID_PAIRING_CODE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Pairing code validation failed — expired, malformed, or already used',
  },
  LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING: {
    statusCode: 2206,
    appEvent: AppEventCode.LOGIN_REMEMBERED_DEVICE_INVALID_PAIRING_CODE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Remembered device pairing code rejected — device binding may be stale',
  },
  LOGIN_SAME_DEVICE_INVALID_PAIRING: {
    statusCode: 2207,
    appEvent: AppEventCode.LOGIN_SAME_DEVICE_INVALID_PAIRING_CODE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Same-device pairing code rejected — code mismatch or session expired',
  },
  UNAUTHORIZED: {
    statusCode: 2208,
    appEvent: AppEventCode.ERR_210_UNAUTHORIZED,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.AUTHENTICATION,
    message: 'HTTP 401 — token missing, expired, or invalid',
  },
  TOO_MANY_ACTIVE_ACCOUNTS: {
    statusCode: 2209,
    appEvent: AppEventCode.TOO_MANY_ACTIVE_ACCOUNTS,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.AUTHENTICATION,
    message: 'Account limit reached — user has too many active registrations',
  },

  // ============================================
  // Credential/Card Errors (2300-2399)
  // ============================================
  CARD_EXPIRED_WILL_REMOVE: {
    statusCode: 2300,
    appEvent: AppEventCode.CARD_EXPIRED_WILL_REMOVE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
    message: 'Credential TTL exceeded — card will be purged from local storage',
  },
  CARD_STATUS_CANCELLED: {
    statusCode: 2301,
    appEvent: AppEventCode.CARD_STATUS_CANCELLED,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
    message: 'Credential status returned CANCELLED from issuer',
  },
  CARD_STATUS_EXPIRED: {
    statusCode: 2302,
    appEvent: AppEventCode.CARD_STATUS_EXPIRED,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
    message: 'Credential status returned EXPIRED from issuer',
  },
  CARD_STATUS_REMOVED: {
    statusCode: 2303,
    appEvent: AppEventCode.CARD_STATUS_REMOVED,
    severity: ErrorSeverity.INFO,
    category: ErrorCategory.CREDENTIAL,
    message: 'Credential was deleted from local storage',
  },
  CARD_TYPE_CHANGED: {
    statusCode: 2304,
    appEvent: AppEventCode.CARD_TYPE_CHANGED,
    severity: ErrorSeverity.INFO,
    category: ErrorCategory.CREDENTIAL,
    message: 'Credential type changed on issuer side — local card metadata is stale',
  },
  PHYSICAL_CARD_WILL_EXPIRE: {
    statusCode: 2306,
    appEvent: AppEventCode.PHYSICAL_CARD_WILL_EXPIRE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.CREDENTIAL,
    message: 'Physical card approaching expiry date — renewal required',
  },

  // ============================================
  // Verification Errors (2400-2499)
  // ============================================
  VERIFY_NOT_COMPLETE: {
    statusCode: 2400,
    appEvent: AppEventCode.VERIFY_NOT_COMPLETE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
    message: 'Verification flow exited before all required steps completed',
  },
  VERIFY_STEPS_INCOMPLETE: {
    statusCode: 2401,
    appEvent: AppEventCode.VERIFY_STEPS_INCOMPLETE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
    message: 'One or more verification steps returned incomplete status',
  },
  FILE_UPLOAD_ERROR: {
    statusCode: 2404,
    appEvent: AppEventCode.FILE_UPLOAD_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'File upload request failed — network error or server rejection',
  },
  VIDEO_VERIFY_NOT_COMPLETE: {
    statusCode: 2405,
    appEvent: AppEventCode.VIDEO_VERIFY_NOT_COMPLETE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
    message: 'Video verification session ended before capture was finalized',
  },
  VIDEO_CAPTURE_ERROR: {
    statusCode: 2406,
    appEvent: AppEventCode.ERR_116_VIDEO_CAPTURE_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Video capture threw an exception — camera or encoding failure',
  },
  INCOMPLETE_REMOTE_VERIFICATION: {
    statusCode: 2407,
    appEvent: AppEventCode.INCOMPLETE_REMOTE_VERIFICATION,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
    message: 'Remote verification returned incomplete — pending or abandoned by verifier',
  },
  DELETE_VERIFY_REQUEST_ERROR: {
    statusCode: 2408,
    appEvent: AppEventCode.DELETE_VERIFY_REQUEST_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'DELETE request for verification record failed on server',
  },
  VERIFY_REQUEST_EXPIRED: {
    statusCode: 2409,
    appEvent: AppEventCode.USER_INPUT_EXPIRED_VERIFY_REQUEST,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.VERIFICATION,
    message: 'Verification request TTL exceeded — user must restart the flow',
  },
  ALREADY_VERIFIED: {
    statusCode: 2410,
    appEvent: AppEventCode.ALREADY_VERIFIED,
    severity: ErrorSeverity.INFO,
    category: ErrorCategory.VERIFICATION,
    message: 'Verification request was already completed in a previous session',
  },

  // ============================================
  // Token/Crypto Errors (2500-2599)
  // ============================================
  INVALID_TOKEN: {
    statusCode: 2500,
    appEvent: AppEventCode.INVALID_TOKEN,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'Token failed validation — malformed, expired, or signature mismatch',
  },
  NO_TOKENS_RETURNED: {
    statusCode: 2501,
    appEvent: AppEventCode.NO_TOKENS_RETURNED,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'Token endpoint returned no tokens in the response payload',
  },
  TOKEN_NULL: {
    statusCode: 2502,
    appEvent: AppEventCode.ERR_119_TOKEN_UNEXPECTEDLY_NULL,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'Token reference was null at point of use — storage read may have failed',
  },
  TOKEN_EXPIRY_ERROR: {
    statusCode: 2503,
    appEvent: AppEventCode.ERR_118_FAILED_TO_RETRIEVE_TOKEN_EXPIRY,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'Could not extract exp claim from token — missing or unparseable',
  },
  DECRYPT_VERIFY_ID_TOKEN_ERROR: {
    statusCode: 2504,
    appEvent: AppEventCode.ERR_105_UNABLE_TO_DECRYPT_AND_VERIFY_ID_TOKEN,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'ID token decryption or signature verification failed — key mismatch or corrupted payload',
  },
  DESERIALIZE_ID_TOKEN_ERROR: {
    statusCode: 2505,
    appEvent: AppEventCode.ERR_106_UNABLE_TO_DESERIALIZE_ID_TOKEN,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'ID token JSON deserialization failed — payload is not valid JSON',
  },
  PARSE_JWT_ERROR: {
    statusCode: 2506,
    appEvent: AppEventCode.ERR_107_UNABLE_TO_PARSE_JWT_TOKENS,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'JWT parsing failed — invalid header, payload, or base64 encoding',
  },
  DECRYPT_JWE_ERROR: {
    statusCode: 2507,
    appEvent: AppEventCode.ERR_110_UNABLE_TO_DECRYPT_JWE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'JWE decryption failed — wrong key, unsupported algorithm, or corrupted ciphertext',
  },
  MISSING_JWK_ERROR: {
    statusCode: 2508,
    appEvent: AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'JWS verification aborted — required JWK not found in JWKS endpoint response',
  },
  JWS_VERIFICATION_FAILED: {
    statusCode: 2509,
    appEvent: AppEventCode.ERR_112_JWS_VERIFICATION_FAILED,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'JWS signature verification failed — signature does not match payload',
  },
  JOSE_EXCEPTION: {
    statusCode: 2510,
    appEvent: AppEventCode.ERR_113_UNABLE_TO_VERIFY_JOSE_EXCEPTION,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'JOSE library threw an exception during verify — check algorithm and key compatibility',
  },
  CLAIMS_SET_ERROR: {
    statusCode: 2511,
    appEvent: AppEventCode.ERR_114_FAILED_TO_GET_CLAIMS_SET_AFTER_DECRYPT_AND_VERIFY,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'Claims set extraction returned null after successful decrypt and verify',
  },
  SIGN_CLAIMS_ERROR: {
    statusCode: 2512,
    appEvent: AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'Claims set signing failed — private key unavailable or signing algorithm error',
  },
  PARSE_JWS_ERROR: {
    statusCode: 2513,
    appEvent: AppEventCode.ERR_117_FAILED_TO_PARSE_JWS,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'JWS compact serialization parsing failed — invalid format or encoding',
  },
  JWT_DEVICE_INFO_ERROR: {
    statusCode: 2514,
    appEvent: AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.TOKEN,
    message: 'Failed to embed or extract device info from JWT payload',
  },

  // ============================================
  // Storage Errors (2600-2699)
  // ============================================
  STORAGE_WRITE_ERROR: {
    statusCode: 2600,
    appEvent: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
    message: 'AsyncStorage or secure storage write operation failed',
  },
  STORAGE_READ_ERROR: {
    statusCode: 2601,
    appEvent: AppEventCode.ERR_101_FAILED_TO_READ_LOCAL_STORAGE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
    message: 'AsyncStorage or secure storage read operation failed',
  },
  KEYCHAIN_KEY_EXISTS: {
    statusCode: 2602,
    appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
    message: 'Attempted to create a keychain entry that already exists — duplicate key alias',
  },
  KEYCHAIN_KEY_NOT_FOUND: {
    statusCode: 2603,
    appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
    message: 'Keychain lookup returned nil — key alias does not exist in keystore',
  },
  KEYCHAIN_KEY_GENERATION_ERROR: {
    statusCode: 2604,
    appEvent: AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
    message: 'Keychain key generation failed — secure enclave or keystore error',
  },
  DELETE_KEY_PAIR_ERROR: {
    statusCode: 2605,
    appEvent: AppEventCode.ERR_108_UNABLE_TO_DELETE_KEY_PAIR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
    message: 'Key pair deletion from keychain/keystore failed',
  },
  KEYS_OUT_OF_SYNC: {
    statusCode: 2606,
    appEvent: AppEventCode.ERR_299_KEYS_OUT_OF_SYNC,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.STORAGE,
    message: 'Local key pair does not match server-side public key — re-registration required',
  },
  TOJSON_METHOD_FAILURE: {
    statusCode: 2607,
    appEvent: AppEventCode.ERR_120_TOJSON_METHOD_FAILURE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
    message: 'Object toJSON() serialization threw an exception',
  },
  TOJSONSTRING_METHOD_FAILURE: {
    statusCode: 2608,
    appEvent: AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.STORAGE,
    message: 'Object toJSONString() serialization threw an exception',
  },

  // ============================================
  // Device Errors (2700-2799)
  // ============================================
  ANDROID_APP_UPDATE_REQUIRED: {
    statusCode: 2700,
    appEvent: AppEventCode.ANDROID_APP_UPDATE_REQUIRED,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
    message: 'Server requires a newer Android app version — current build is below minimum',
  },
  IOS_APP_UPDATE_REQUIRED: {
    statusCode: 2701,
    appEvent: AppEventCode.IOS_APP_UPDATE_REQUIRED,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
    message: 'Server requires a newer iOS app version — current build is below minimum',
  },
  ANDROID_DEVICE_PROTECTION_REQUIRED: {
    statusCode: 2702,
    appEvent: AppEventCode.ANDROID_DEVICE_PROTECTION_REQUIRED,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
    message: 'Android device lacks screen lock or biometric — security policy not met',
  },
  IOS_DEVICE_PROTECTION_REQUIRED: {
    statusCode: 2703,
    appEvent: AppEventCode.IOS_DEVICE_PROTECTION_REQUIRED,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.DEVICE,
    message: 'iOS device lacks passcode or biometric — security policy not met',
  },
  CLOCK_SKEW_ERROR: {
    statusCode: 2704,
    appEvent: AppEventCode.CLOCK_SKEW_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
    message: 'Device clock skew exceeds acceptable threshold — token validation will fail',
  },
  DEVICE_AUTHORIZATION_ERROR: {
    statusCode: 2705,
    appEvent: AppEventCode.DEVICE_AUTHORIZATION_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
    message: 'Device authorization grant failed — device may not be registered or approved',
  },
  ADD_CARD_INCORRECT_OS: {
    statusCode: 2706,
    appEvent: AppEventCode.ADD_CARD_INCORRECT_OS,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
    message: 'OS version does not meet minimum requirements for card provisioning',
  },
  DEVICE_AUTHENTICATION_ERROR: {
    statusCode: 2707,
    appEvent: AppEventCode.DEVICE_AUTHENTICATION_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
    message: 'Device authentication failed — biometric or passcode verification did not succeed',
  },

  // ============================================
  // General/Registration Errors (2800-2899)
  // ============================================
  GENERAL_ERROR: {
    statusCode: 2800,
    appEvent: AppEventCode.GENERAL,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'An unexpected error occurred',
  },
  DYNAMIC_REGISTRATION_ERROR: {
    statusCode: 2801,
    appEvent: AppEventCode.ADD_CARD_DYNAMIC_REGISTRATION,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'OAuth2 dynamic client registration request failed',
  },
  APP_VERSION_NOT_SUPPORTED: {
    statusCode: 2802,
    appEvent: AppEventCode.ADD_CARD_DYNAMIC_REGISTRATION_APPVERSION_NOT_SUPPORTED,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Dynamic registration rejected — app version not in server allow list',
  },
  CLIENT_REGISTRATION_NULL: {
    statusCode: 2803,
    appEvent: AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Client registration object was null when expected — storage lookup returned nothing',
  },
  DESERIALIZE_JSON_ERROR: {
    statusCode: 2805,
    appEvent: AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'JSON.parse() failed — response body is not valid JSON',
  },
  SERIALIZE_JSON_ERROR: {
    statusCode: 2806,
    appEvent: AppEventCode.ERR_115_FAILED_TO_SERIALIZE_JSON,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'JSON.stringify() failed — object contains circular references or non-serializable values',
  },
  PROVIDER_NULL: {
    statusCode: 2807,
    appEvent: AppEventCode.ERR_116_PROVIDER_UNEXPECTEDLY_NULL,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Provider reference was null at point of use — initialization may have been skipped',
  },
  CLIENT_REGISTRATION_FAILURE: {
    statusCode: 2808,
    appEvent: AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Client registration process threw an unhandled exception',
  },
  CREATING_CLIENT_REGISTRATION_FAILED: {
    statusCode: 2809,
    appEvent: AppEventCode.ERR_213_FAILED_CREATING_CLIENT_REGISTRATION,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Server rejected client registration creation — check request body and credentials',
  },
  INVALID_REGISTRATION_REQUEST: {
    statusCode: 2810,
    appEvent: AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Registration request payload failed validation — missing or invalid fields',
  },
  MISSING_JSON_VALUES: {
    statusCode: 2811,
    appEvent: AppEventCode.ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Required fields in JSON response were null or missing — schema mismatch',
  },
  SERVER_CONFIGURATION_ERROR: {
    statusCode: 2812,
    appEvent: AppEventCode.ADD_CARD_SERVER_CONFIGURATION,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Failed to fetch or parse server configuration (e.g. .well-known/openid-configuration)',
  },
  ADD_CARD_SERVER_ERROR: {
    statusCode: 2813,
    appEvent: AppEventCode.ADD_CARD_SERVER_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Card provisioning request to server failed — check server logs for details',
  },
  PIN_STORE_ERROR: {
    statusCode: 2814,
    appEvent: AppEventCode.ADD_CARD_PIN_STORE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Failed to store or retrieve PIN from secure storage',
  },
  PROVIDER_ERROR: {
    statusCode: 2815,
    appEvent: AppEventCode.ADD_CARD_PROVIDER,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Card provider lookup or initialization failed',
  },
  FETCHED_PROVIDER_NULL: {
    statusCode: 2816,
    appEvent: AppEventCode.ERR_221_FETCHED_PROVIDER_NULL_EXCEPTION,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Provider fetch returned null — endpoint may have returned empty or provider ID is invalid',
  },
  TERMS_OF_USE_ERROR: {
    statusCode: 2817,
    appEvent: AppEventCode.ADD_CARD_TERMS_OF_USE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Terms of use acceptance or retrieval failed during card provisioning',
  },
  VALID_CREDENTIAL_EMPTY_KEYCHAIN: {
    statusCode: 2818,
    appEvent: AppEventCode.VALID_CREDENTIAL_EMPTY_KEYCHAIN,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Credential exists in storage but associated keychain entry is missing — state inconsistency',
  },
  APP_SETUP_NOT_COMPLETE: {
    statusCode: 2819,
    appEvent: AppEventCode.APP_SETUP_NOT_COMPLETE,
    severity: ErrorSeverity.WARNING,
    category: ErrorCategory.GENERAL,
    message: 'App initialization sequence did not complete — required setup steps were skipped',
  },
  FAILED_TO_RETRIEVE_STRING_RESOURCE: {
    statusCode: 2820,
    appEvent: AppEventCode.ERR_400_FAILED_TO_RETRIEVE_STRING_RESOURCE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.GENERAL,
    message: 'Localized string resource lookup failed — key not found in bundle',
  },
  VIDEO_SERVICE_HOURS_NULL: {
    statusCode: 2821,
    appEvent: AppEventCode.ERR_115_VIDEO_SERVICE_HOURS_UNEXPECTEDLY_NULL,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Video service hours config returned null — service availability cannot be determined',
  },
  ACCOUNT_NOT_FOUND: {
    statusCode: 2822,
    appEvent: AppEventCode.ACCOUNT_NOT_FOUND,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.GENERAL,
    message: 'No account found for the current user — state may be corrupted or missing',
  },
  VIDEO_SERVICE_HOURS_MALFORMED_TIME: {
    statusCode: 2823,
    appEvent: AppEventCode.VIDEO_SERVICE_HOURS_MALFORMED_TIME,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Service hours API returned a malformed time string — expected HH:MM format',
  },

  // ============================================
  // Wallet/Agent Errors (2900-2999)
  // ============================================
  STATE_LOAD_ERROR: {
    statusCode: 2900,
    appEvent: AppEventCode.STATE_LOAD_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.WALLET,
    message: 'Wallet state deserialization from persistent storage failed',
  },
  AGENT_INITIALIZATION_ERROR: {
    statusCode: 2901,
    appEvent: AppEventCode.AGENT_INITIALIZATION_ERROR,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.WALLET,
    message: 'Aries agent initialization failed — check wallet key, mediator config, and ledger connectivity',
  },
  WALLET_SECRET_NOT_FOUND: {
    statusCode: 2902,
    appEvent: AppEventCode.WALLET_SECRET_NOT_FOUND,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.WALLET,
    message: 'Wallet secret not found in secure storage — wallet may need to be re-created',
  },

  // ============================================
  // Connection/BCID Errors (3000-3099)
  // ============================================
  PARSE_INVITATION_ERROR: {
    statusCode: 3000,
    appEvent: AppEventCode.PARSE_INVITATION_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
    message: 'Connection invitation URL/payload could not be parsed — invalid format',
  },
  RECEIVE_INVITATION_ERROR: {
    statusCode: 3001,
    appEvent: AppEventCode.RECEIVE_INVITATION_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
    message: 'Agent failed to process and accept the connection invitation',
  },
  LEGACY_DID_ERROR: {
    statusCode: 3002,
    appEvent: AppEventCode.LEGACY_DID_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
    message: 'Legacy DID resolution or conversion failed — unsupported DID method',
  },
  APP_TO_APP_URL_ERROR: {
    statusCode: 3003,
    appEvent: AppEventCode.APP_TO_APP_URL_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
    message: 'App-to-app deep link URL is malformed or missing required parameters',
  },
  SERVICE_CARD_AUTH_ERROR: {
    statusCode: 3004,
    appEvent: AppEventCode.SERVICE_CARD_AUTH_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.CONNECTION,
    message: 'BC Services Card authentication flow failed — OIDC callback error',
  },

  // ============================================
  // Attestation Errors (3100-3199)
  // ============================================
  ATTESTATION_BAD_INVITATION: {
    statusCode: 3100,
    appEvent: AppEventCode.ATTESTATION_BAD_INVITATION,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Attestation invitation failed validation — malformed or expired',
  },
  ATTESTATION_CONNECTION_ERROR: {
    statusCode: 3101,
    appEvent: AppEventCode.ATTESTATION_CONNECTION_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Failed to establish agent connection for attestation exchange',
  },
  ATTESTATION_NONCE_ERROR: {
    statusCode: 3102,
    appEvent: AppEventCode.ATTESTATION_NONCE_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Attestation nonce generation or validation failed',
  },
  ATTESTATION_GENERATION_ERROR: {
    statusCode: 3103,
    appEvent: AppEventCode.ATTESTATION_GENERATION_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Platform attestation generation failed — Play Integrity or App Attest error',
  },
  ATTESTATION_VALIDATION_ERROR: {
    statusCode: 3104,
    appEvent: AppEventCode.ATTESTATION_VALIDATION_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Server-side attestation validation rejected the token',
  },
  ATTESTATION_AGENT_UNDEFINED: {
    statusCode: 3105,
    appEvent: AppEventCode.ATTESTATION_AGENT_UNDEFINED,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.VERIFICATION,
    message: 'Attestation requires an initialized agent but agent reference is undefined',
  },
  ATTESTATION_INTEGRITY_UNAVAILABLE: {
    statusCode: 3106,
    appEvent: AppEventCode.ATTESTATION_INTEGRITY_UNAVAILABLE,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Platform integrity API (Play Integrity / App Attest) is not available on this device',
  },
  ATTESTATION_GENERAL_PROOF_ERROR: {
    statusCode: 3107,
    appEvent: AppEventCode.ATTESTATION_GENERAL_PROOF_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Attestation proof presentation failed — agent could not construct or send proof',
  },
  ATTESTATION_REQUEST_ERROR: {
    statusCode: 3108,
    appEvent: AppEventCode.ATTESTATION_REQUEST_ERROR,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.VERIFICATION,
    message: 'Attestation request to verification service failed — network or server error',
  },
  ATTESTATION_UNSUPPORTED_PLATFORM: {
    statusCode: 3109,
    appEvent: AppEventCode.ATTESTATION_UNSUPPORTED_PLATFORM,
    severity: ErrorSeverity.ERROR,
    category: ErrorCategory.DEVICE,
    message: 'Current platform does not support attestation — requires iOS 14+ or Android with Play Services',
  },
} as const satisfies Record<string, ErrorDefinition>

export const ErrorRegistryAppEventMap = new Map<AppEventCode, ErrorDefinition>(
  Object.values(ErrorRegistry).map((definition) => [definition.appEvent, definition])
)

export type ErrorRegistryKey = keyof typeof ErrorRegistry
