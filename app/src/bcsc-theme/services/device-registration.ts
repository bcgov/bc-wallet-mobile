import { throwNativeBcscError } from '@/bcsc-theme/utils/native-error-map'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import type { BifoldLogger } from '@bifold/core'
import type { NativeAccount } from 'react-native-bcsc-core'
// eslint-disable-next-line no-restricted-imports -- the one caller: the registration is saved and cleared here only
import { clearRegistration, getAccount, getToken, setRegistration, TokenType } from 'react-native-bcsc-core'

const LOG_TAG = '[DeviceRegistration]'

/**
 * The device's registration with IAS: which client this device is (`clientId`, at `issuer`) and the token
 * that manages that registration. This module is its only owner: nothing else reads, saves or clears it,
 * and the three values are saved together and cleared together so they cannot stop matching (#4925).
 *
 * The values stay in native secure storage. The client ID and issuer are on the account record, where
 * native code reads them (iOS finds every token by the client ID), and the token is in the keychain (iOS)
 * or the encrypted tokens file (Android).
 *
 * What clears it: a verification reset and a registration cycle, each of which then registers again, and
 * removing the account. Locking the app, signing out and an app update leave it in place.
 */
export type DeviceRegistration = {
  clientId: string
  issuer: string
  registrationAccessToken: string
}

/**
 * What the device holds of its registration, field by field. An account that has not registered yet
 * holds only its issuer. Any other gap dates from before the registration had one owner; unlock fills it
 * in (`hydrateSecureState`).
 */
export type StoredDeviceRegistration = Partial<DeviceRegistration>

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0

/**
 * Reads what the device holds of its registration.
 *
 * @param account The account, when the caller has already read it. Left out, it is read here.
 * @throws The native rejection when the account or the token cannot be read
 */
export const readStoredDeviceRegistration = async (
  account?: NativeAccount | null
): Promise<StoredDeviceRegistration> => {
  const storedAccount = account === undefined ? await getAccount() : account

  if (!storedAccount) {
    // Nothing is registered without an account, and the token read rejects without one
    return {}
  }

  // eslint-disable-next-line no-restricted-syntax -- the one reader of the registration access token
  const token = await getToken(TokenType.Registration)

  return {
    clientId: storedAccount.clientID || undefined,
    issuer: storedAccount.issuer || undefined,
    registrationAccessToken: token?.token || undefined,
  }
}

/**
 * Reads the registration. Null when the device has none, or holds only part of one: a call that manages
 * the registration needs the client ID and its token together.
 *
 * @param account The account, when the caller has already read it. Left out, it is read here.
 * @throws The native rejection when the account or the token cannot be read
 */
export const readDeviceRegistration = async (account?: NativeAccount | null): Promise<DeviceRegistration | null> => {
  const { clientId, issuer, registrationAccessToken } = await readStoredDeviceRegistration(account)

  if (!clientId || !issuer || !registrationAccessToken) {
    return null
  }

  return { clientId, issuer, registrationAccessToken }
}

/**
 * Saves a registration the server returned: the client ID, issuer and registration access token in one
 * step. A failed save leaves the previous registration in place.
 *
 * @throws AppError: CLIENT_REGISTRATION_NULL when a value is missing, so part of a registration is never
 * saved; otherwise the mapped native failure (TOKEN_SAVE_FAILED, NATIVE_STORAGE_WRITE_FAILED, ACCOUNT_NOT_FOUND)
 */
export const saveDeviceRegistration = async (registration: DeviceRegistration, logger: BifoldLogger): Promise<void> => {
  const { clientId, issuer, registrationAccessToken } = registration

  if (!isNonEmptyString(clientId) || !isNonEmptyString(issuer) || !isNonEmptyString(registrationAccessToken)) {
    logger.error(`${LOG_TAG} Not saved: the registration is missing its client ID, issuer or token`)
    throw AppError.fromErrorDefinition(ErrorRegistry.CLIENT_REGISTRATION_NULL)
  }

  try {
    await setRegistration(clientId, issuer, registrationAccessToken)
  } catch (error) {
    logger.error(`${LOG_TAG} Failed to save the registration; the previous one is still in place`, error as Error)
    throwNativeBcscError(error)
  }

  logger.info(`${LOG_TAG} Registration saved`)
}

/**
 * Fills in a client ID or issuer the account record is missing, from what the device already holds: the
 * registration token's own client ID, or a record carried over from v3. The stored token is left as it
 * is, because this is not a new registration and a v3 upgrade may have no token to save.
 *
 * @throws AppError: the mapped native failure (NATIVE_STORAGE_WRITE_FAILED, ACCOUNT_NOT_FOUND)
 */
export const fillInDeviceRegistration = async (
  identity: Pick<DeviceRegistration, 'clientId' | 'issuer'>,
  logger: BifoldLogger
): Promise<void> => {
  try {
    await setRegistration(identity.clientId, identity.issuer, null)
  } catch (error) {
    logger.error(`${LOG_TAG} Failed to fill in the registration`, error as Error)
    throwNativeBcscError(error)
  }

  logger.info(`${LOG_TAG} Registration filled in`)
}

/**
 * Clears the registration: the account keeps its issuer, security method and nickname, but has no client
 * ID and no registration access token. Clearing a registration that is already absent succeeds.
 *
 * Delete the access and refresh tokens first. They belong to the registration being cleared, and iOS
 * stores them under its client ID, where they could not be found afterwards.
 *
 * @throws AppError: the mapped native failure (NATIVE_STORAGE_WRITE_FAILED, TOKEN_DELETE_FAILED); the
 * registration is then still in place
 */
export const clearDeviceRegistration = async (logger: BifoldLogger): Promise<void> => {
  try {
    await clearRegistration()
  } catch (error) {
    logger.error(`${LOG_TAG} Failed to clear the registration; it is still in place`, error as Error)
    throwNativeBcscError(error)
  }

  logger.info(`${LOG_TAG} Registration cleared`)
}
