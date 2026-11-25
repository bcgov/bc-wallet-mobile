import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import type { BifoldLogger } from '@bifold/core'

const LOG_TAG = '[DeviceRegistration]'

/**
 * The device's registration with IAS: which client this device is (`clientId`, at `issuer`) and the token
 * that manages that registration. This module is its only owner: nothing else reads, saves or clears it,
 * and the three values are saved together and cleared together so they cannot stop matching (#4925).
 *
 * All three are one keychain item (`account/registration`), so a save writes them in one step.
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

/** Reads what the device holds of its registration. */
export const readStoredDeviceRegistration = (): StoredDeviceRegistration => {
  const { profile, registration } = getBCSCState().account

  if (!profile) {
    // Nothing is registered without an account
    return {}
  }

  return {
    clientId: registration?.clientId || undefined,
    // The account's issuer until the device registers
    issuer: registration?.issuer || profile.issuer || undefined,
    registrationAccessToken: registration?.registrationAccessToken || undefined,
  }
}

/**
 * Reads the registration. Null when the device has none, or holds only part of one: a call that manages
 * the registration needs the client ID and its token together.
 */
export const readDeviceRegistration = (): DeviceRegistration | null => {
  const { clientId, issuer, registrationAccessToken } = readStoredDeviceRegistration()

  if (!clientId || !issuer || !registrationAccessToken) {
    return null
  }

  return { clientId, issuer, registrationAccessToken }
}

const rethrow = (error: unknown): never => {
  throw AppError.fromErrorDefinition(ErrorRegistry.STORAGE_WRITE_ERROR, { cause: error })
}

// The registration belongs to the account, so it is never saved without one
const requireAccount = (logger: BifoldLogger) => {
  if (!getBCSCState().account.profile) {
    logger.error(`${LOG_TAG} Not saved: there is no account`)
    throw AppError.fromErrorDefinition(ErrorRegistry.ACCOUNT_NOT_FOUND)
  }
}

/**
 * Saves a registration the server returned: the client ID, issuer and registration access token in one
 * step. A failed save leaves the previous registration in place.
 *
 * @throws AppError: CLIENT_REGISTRATION_NULL when a value is missing, so part of a registration is never
 * saved; ACCOUNT_NOT_FOUND without an account; STORAGE_WRITE_ERROR when storage refuses the write
 */
export const saveDeviceRegistration = async (registration: DeviceRegistration, logger: BifoldLogger): Promise<void> => {
  const { clientId, issuer, registrationAccessToken } = registration

  if (!isNonEmptyString(clientId) || !isNonEmptyString(issuer) || !isNonEmptyString(registrationAccessToken)) {
    logger.error(`${LOG_TAG} Not saved: the registration is missing its client ID, issuer or token`)
    throw AppError.fromErrorDefinition(ErrorRegistry.CLIENT_REGISTRATION_NULL)
  }

  requireAccount(logger)

  try {
    await getBCSCState().account.setRegistration({ clientId, issuer, registrationAccessToken })
  } catch (error) {
    logger.error(`${LOG_TAG} Failed to save the registration; the previous one is still in place`, error as Error)
    rethrow(error)
  }

  logger.info(`${LOG_TAG} Registration saved`)
}

/**
 * Fills in a client ID or issuer the account is missing, from what the device already holds: the
 * registration token's own client ID, or a record carried over from v3. The stored token is left as it
 * is, because this is not a new registration and a v3 upgrade may have no token to save.
 *
 * @throws AppError: ACCOUNT_NOT_FOUND without an account; STORAGE_WRITE_ERROR when storage refuses the write
 */
export const fillInDeviceRegistration = async (
  identity: Pick<DeviceRegistration, 'clientId' | 'issuer'>,
  logger: BifoldLogger
): Promise<void> => {
  requireAccount(logger)

  try {
    const { account } = getBCSCState()
    await account.setRegistration({
      ...identity,
      registrationAccessToken: account.registration?.registrationAccessToken,
    })
    // A blank issuer on the account is the gap being filled, as the native account record had it
    if (!account.profile?.issuer) {
      await account.updateProfile({ issuer: identity.issuer })
    }
  } catch (error) {
    logger.error(`${LOG_TAG} Failed to fill in the registration`, error as Error)
    rethrow(error)
  }

  logger.info(`${LOG_TAG} Registration filled in`)
}

/**
 * Clears the registration: the account keeps its issuer, security method and nickname, but has no client
 * ID and no registration access token. Clearing a registration that is already absent succeeds.
 *
 * @throws AppError: STORAGE_WRITE_ERROR when storage refuses the write
 */
export const clearDeviceRegistration = async (logger: BifoldLogger): Promise<void> => {
  try {
    await getBCSCState().account.setRegistration(undefined)
  } catch (error) {
    logger.error(`${LOG_TAG} Failed to clear the registration; it is still in place`, error as Error)
    rethrow(error)
  }

  logger.info(`${LOG_TAG} Registration cleared`)
}

/**
 * After a failed save of a token the server rotated: the session carries on with it, because the server has
 * revoked the stored one. The next unlock reads the stored registration again.
 */
export const keepDeviceRegistrationInMemory = (registration: DeviceRegistration): void => {
  getBCSCState().account.keepRegistrationInMemory(registration)
}
