import { AppError, ErrorRegistry } from '@/errors'
import { ErrorDefinition } from '@/errors/errorRegistry'
import { isBcscNativeError } from 'react-native-bcsc-core'

// TODO (MD): Move to `errorHandler.ts`

/**
 * Wraps any caught error as an AppError using the provided definition.
 * The original error is preserved in the cause chain for debugging.
 */
export const toAppError = (error: unknown, definition: ErrorDefinition): AppError =>
  AppError.fromErrorDefinition(definition, { cause: error })

/**
 * Throwing variant of {@link toAppError}.
 */
export const throwAppError = (error: unknown, definition: ErrorDefinition): never => {
  throw toAppError(error, definition)
}

/**
 * Single source of truth mapping raw native bcsc-core rejection codes (`error.code`, e.g.
 * `E_KEY_NOT_FOUND`) to their app-level {@link ErrorDefinition}.
 *
 * Keyed by the RAW native string because the native layer rejects with codes beyond the
 * `BcscNativeErrorCodes` enum, and the same condition can carry different strings per platform
 * (iOS vs Android) — both are mapped to one definition here rather than renamed natively.
 *
 * Codes not present here fall through to {@link ErrorRegistry.UNMAPPED_NATIVE_ERROR}, which still
 * preserves the raw native code via the error `cause` (surfaced by `AppError.technicalMessage`).
 */
export const nativeBcscErrorMap: ReadonlyMap<string, ErrorDefinition> = new Map<string, ErrorDefinition>([
  // --- DCR / keychain (E_120_* series) — reuse existing definitions ---
  ['E_120_TOJSON_METHOD_FAILURE', ErrorRegistry.TOJSON_METHOD_FAILURE],
  ['E_120_TOJSONSTRING_METHOD_FAILURE', ErrorRegistry.TOJSONSTRING_METHOD_FAILURE],
  ['E_120_KEYCHAIN_KEY_EXISTS_ERROR', ErrorRegistry.KEYCHAIN_KEY_EXISTS],
  ['E_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR', ErrorRegistry.KEYCHAIN_KEY_NOT_FOUND],
  ['E_120_KEYCHAIN_KEY_GENERATION_ERROR', ErrorRegistry.KEYCHAIN_KEY_GENERATION_ERROR],
  ['E_120_JWT_DEVICE_INFO_ERROR', ErrorRegistry.JWT_DEVICE_INFO_ERROR],
  // Keychain/keystore temporarily unavailable — retryable. iOS + Android strings → one definition.
  ['E_120_KEYCHAIN_UNAVAILABLE_ERROR', ErrorRegistry.KEYCHAIN_UNAVAILABLE],
  ['E_KEYSTORE_UNAVAILABLE', ErrorRegistry.KEYCHAIN_UNAVAILABLE],

  // --- Serialization ---
  ['E_JSON_SERIALIZATION_FAILED', ErrorRegistry.SERIALIZE_JSON_ERROR],

  // --- Keys / keystore ---
  ['E_KEY_NOT_FOUND', ErrorRegistry.KEYCHAIN_KEY_NOT_FOUND],
  ['E_KEY_EXPORT_FAILED', ErrorRegistry.KEY_EXPORT_FAILED],
  ['E_KEY_DATA_EXTRACTION_FAILED', ErrorRegistry.KEY_EXPORT_FAILED],
  ['E_KEY_COMPONENT_PARSING_FAILED', ErrorRegistry.KEY_EXPORT_FAILED],
  ['E_KEY_ERROR', ErrorRegistry.KEY_OPERATION_ERROR],
  ['E_KEYSTORE_ERROR', ErrorRegistry.KEY_OPERATION_ERROR],
  ['E_NO_KEYS_FOUND', ErrorRegistry.NO_SIGNING_KEYS],
  ['E_KEYPAIR_RETRIEVAL_FAILED', ErrorRegistry.NO_SIGNING_KEYS],

  // --- Signing / JWT / JWE / JWS ---
  ['E_JWT_SIGN_FAILED', ErrorRegistry.SIGN_CLAIMS_ERROR],
  ['E_FAILED_TO_PARSE_JWS', ErrorRegistry.PARSE_JWS_ERROR],
  ['E_INVALID_JWT', ErrorRegistry.PARSE_JWT_ERROR],
  ['E_DECODE_LOGIN_CHALLENGE_ERROR', ErrorRegistry.PARSE_JWT_ERROR],
  ['E_INVALID_JWK', ErrorRegistry.MISSING_JWK_ERROR],
  ['E_PAYLOAD_DECODE_ERROR', ErrorRegistry.DECRYPT_JWE_ERROR],
  ['E_JWE_DECRYPT_ERROR', ErrorRegistry.DECRYPT_JWE_ERROR],
  ['E_JWE_PARSE_ERROR', ErrorRegistry.DECRYPT_JWE_ERROR],
  ['E_BCSC_DECODE_ERROR', ErrorRegistry.DECRYPT_JWE_ERROR],
  ['E_JWT_ENCRYPTION_FAILED', ErrorRegistry.JWT_ENCRYPTION_FAILED],
  ['E_JWT_ENCRYPTION_ERROR', ErrorRegistry.JWT_ENCRYPTION_FAILED],
  ['E_JWT_CREATION_FAILED', ErrorRegistry.JWT_CREATION_FAILED],
  ['E_JWT_PAYLOAD_CREATION_FAILED', ErrorRegistry.JWT_CREATION_FAILED],

  // --- Tokens ---
  ['E_TOKEN_SAVE_FAILED', ErrorRegistry.TOKEN_SAVE_FAILED],
  ['E_TOKEN_SAVE_ERROR', ErrorRegistry.TOKEN_SAVE_FAILED],
  ['E_TOKEN_DELETE_ERROR', ErrorRegistry.TOKEN_DELETE_FAILED],

  // --- Accounts ---
  ['E_ACCOUNT_NOT_FOUND', ErrorRegistry.ACCOUNT_NOT_FOUND],
  ['E_NO_ACCOUNT', ErrorRegistry.NATIVE_ACCOUNT_ID_NOT_FOUND],
  ['E_ACCOUNT_ID_NOT_FOUND', ErrorRegistry.NATIVE_ACCOUNT_ID_NOT_FOUND],

  // --- Native storage: grouped by operation (read / write / delete). The Android E_GET_*/E_SET_*/
  // E_DELETE_* domain families collapse here; the raw code stays in AppError.technicalMessage. ---
  // read
  ['E_READ_FAILED', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_STORAGE_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_GET_ACCOUNT_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_GET_ACCOUNT_FLAGS_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_GET_GLOBAL_FLAGS_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_GET_EVIDENCE_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_GET_CREDENTIAL_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_HAS_CREDENTIAL_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_GET_AUTH_REQUEST_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  ['E_GET_SAVED_SERVICES_ERROR', ErrorRegistry.NATIVE_STORAGE_READ_FAILED],
  // write
  ['E_SAVE_FAILED', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_ENCODE_FAILED', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_FILE_ACCESS_ERROR', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_SAVE_PHOTO_ERROR', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_SAVE_ACCOUNT_FAILED', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_ACCOUNT_STORAGE_FAILED', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_ACCOUNT_ID_NOT_SET', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_UPDATE_ACCOUNT_LIST_ENTRY_FAILED', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_SET_ACCOUNT_FLAGS_ERROR', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_SET_GLOBAL_FLAGS_ERROR', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_SET_EVIDENCE_ERROR', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_SET_CREDENTIAL_ERROR', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_SET_AUTH_REQUEST_ERROR', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  ['E_SET_SAVED_SERVICES_ERROR', ErrorRegistry.NATIVE_STORAGE_WRITE_FAILED],
  // delete
  ['E_DELETE_FAILED', ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED],
  ['E_REMOVE_ACCOUNT_ERROR', ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED],
  ['E_FAILED_TO_DELETE_ACCOUNT', ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED],
  ['E_DELETE_ACCOUNT_FLAGS_ERROR', ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED],
  ['E_DELETE_EVIDENCE_ERROR', ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED],
  ['E_DELETE_CREDENTIAL_ERROR', ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED],
  ['E_DELETE_AUTH_REQUEST_ERROR', ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED],
  ['E_DELETE_SAVED_SERVICES_ERROR', ErrorRegistry.NATIVE_STORAGE_DELETE_FAILED],

  // --- Device auth / security. NOTE: E_DEVICE_AUTH_CANCELLED is intentionally NOT mapped — a user
  // cancel is control flow, handled at the call site, never surfaced as an error. ---
  ['E_CAN_DEVICE_AUTH_ERROR', ErrorRegistry.DEVICE_AUTH_UNAVAILABLE],
  ['E_NO_ACTIVITY', ErrorRegistry.DEVICE_AUTH_UNAVAILABLE],
  ['E_DEVICE_AUTH_ERROR', ErrorRegistry.DEVICE_SECURITY_SETUP_FAILED],
  ['E_SETUP_DEVICE_SECURITY_ERROR', ErrorRegistry.DEVICE_SECURITY_SETUP_FAILED],
  ['E_SETUP_DEVICE_SECURITY_FAILED', ErrorRegistry.DEVICE_SECURITY_SETUP_FAILED],
  ['E_UNLOCK_DEVICE_SECURITY_ERROR', ErrorRegistry.DEVICE_SECURITY_SETUP_FAILED],

  // --- Device identity ---
  ['E_UUID_NOT_FOUND', ErrorRegistry.UUID_NOT_FOUND],

  // --- Invalid parameters / security method / token type ---
  ['E_INVALID_PARAMETERS', ErrorRegistry.NATIVE_INVALID_PARAMETERS],
  ['E_INVALID_SECURITY_METHOD', ErrorRegistry.NATIVE_INVALID_PARAMETERS],
  ['E_INVALID_TOKEN_TYPE', ErrorRegistry.NATIVE_INVALID_PARAMETERS],
  ['E_ACCOUNT_INVALID', ErrorRegistry.NATIVE_INVALID_PARAMETERS],
  ['E_MISSING_INVALID_ACCOUNT_ID', ErrorRegistry.NATIVE_INVALID_PARAMETERS],
  ['E_INVALID_BASE64', ErrorRegistry.NATIVE_INVALID_PARAMETERS],

  // --- OAuth request bodies ---
  ['E_DCR_ERROR', ErrorRegistry.DCR_BODY_BUILD_FAILED],
  ['E_BCSC_DCR_ERROR', ErrorRegistry.DCR_BODY_BUILD_FAILED],
  ['E_DEVICE_CODE_ERROR', ErrorRegistry.DEVICE_CODE_REQUEST_FAILED],
  ['E_BCSC_DEVICE_CODE_ERROR', ErrorRegistry.DEVICE_CODE_REQUEST_FAILED],

  // --- PIN / security method ---
  ['E_SET_PIN_FAILED', ErrorRegistry.PIN_SET_FAILED],
  ['E_DELETE_PIN_FAILED', ErrorRegistry.PIN_DELETE_FAILED],
  ['E_VERIFY_PIN_ERROR', ErrorRegistry.PIN_OPERATION_ERROR],
  ['E_HAS_PIN_SET_ERROR', ErrorRegistry.PIN_OPERATION_ERROR],
  ['E_IS_PIN_AUTO_GENERATED_ERROR', ErrorRegistry.PIN_OPERATION_ERROR],
  ['E_IS_ACCOUNT_LOCKED_ERROR', ErrorRegistry.PIN_OPERATION_ERROR],
  ['E_GET_SECURITY_METHOD_ERROR', ErrorRegistry.PIN_OPERATION_ERROR],
  ['E_SET_SECURITY_METHOD_ERROR', ErrorRegistry.PIN_OPERATION_ERROR],
])

/**
 * Maps a caught native bcsc-core rejection to an {@link AppError} via {@link nativeBcscErrorMap}.
 *
 * Mapped native codes become their specific AppError. Unmapped native codes — and non-native errors
 * — fall back to {@link ErrorRegistry.UNMAPPED_NATIVE_ERROR}; the raw native code is never lost
 * because it is preserved on the error `cause` and surfaced by `AppError.technicalMessage`.
 */
export const mapNativeBcscError = (error: unknown): AppError => {
  if (isBcscNativeError(error)) {
    const definition = nativeBcscErrorMap.get(error.code)
    if (definition) {
      return AppError.fromErrorDefinition(definition, { cause: error })
    }
  }

  return AppError.fromErrorDefinition(ErrorRegistry.UNMAPPED_NATIVE_ERROR, { cause: error })
}

/**
 * Throwing variant of {@link mapNativeBcscError}.
 */
export const throwNativeBcscError = (error: unknown): never => {
  throw mapNativeBcscError(error)
}
