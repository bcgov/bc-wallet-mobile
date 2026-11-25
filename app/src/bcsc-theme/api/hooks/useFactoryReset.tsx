import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { purgeWalletStore } from '@/bcsc-theme/features/agent/services/agent-service'
import { clearPinAttempts } from '@/bcsc-theme/features/auth/services/pin-lockout-service'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { readDeviceRegistration } from '@/bcsc-theme/services/device-registration'
import { storage } from '@/bcsc-theme/storage'
import { getBCSCState, useDeveloper, usePreferences, useSession } from '@/bcsc-theme/storage/hooks'
import { ledgerResolver } from '@/configs/ledgers/indy/ledgerResolver'
import { WALLET_ID } from '@/constants'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'
import { deletePIN } from 'react-native-bcsc-core'
import { Config } from 'react-native-config'
import useRegistrationApi from './useRegistrationApi'

type FactoryResetResult =
  | {
      success: true
    }
  | {
      success: false
      error: Error
    }

/**
 * Hook to perform a factory reset of the BCSC account and state.
 * This should get the application as close as possible to a fresh install state.
 *
 * WARNING: This is a destructive action and will result in loss of all user data and settings.
 *
 * This includes:
 *  - Deleting the IAS account associated with the current clientID from server (non-blocking if fails).
 *  - Deleting all secure data stored in native storage.
 *  - Removing the local account file.
 *  - Clearing the BCSC state in the global store.
 *  - Logging out the user by updating the authentication state.
 *
 * @returns A function that performs the factory reset when called.
 */
export const useFactoryReset = () => {
  const { client, isClientReady } = useBCSCApiClientState()
  const registration = useRegistrationApi(client, Boolean(isClientReady))
  const walletKey = useSession((s) => s.walletKey)
  const preferences = usePreferences()
  const developer = useDeveloper()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { clearSecureState, deleteSecureData } = useSecureActions()
  const agentCtx = useBCSCAgentSafe()

  /**
   * Deletes the account's registration from the IAS server. A failed delete is logged, not thrown.
   *
   * The registration is read from storage, so this works before secure state has been hydrated.
   *
   * @returns A promise that resolves when the deletion attempt is complete.
   */
  const deleteRegistration = useCallback(async () => {
    try {
      const deviceRegistration = readDeviceRegistration()

      if (!deviceRegistration) {
        logger.info('FactoryReset: No registration found on the device, skipping IAS account deletion')
        return
      }

      const deleteIASAccount = await registration.deleteRegistration(
        deviceRegistration.registrationAccessToken,
        deviceRegistration.clientId
      )

      if (!deleteIASAccount.success) {
        logger.warn('FactoryReset: Failed to delete IAS account from server')
      }
    } catch (error) {
      logger.warn('FactoryReset: Error occurred while deleting registration', { error })
    }
  }, [logger, registration])

  /**
   * Removes all artifacts associated with the current BCSC account.
   *
   * @returns A promise that resolves when all account dependencies have been purged.
   */
  const removeAccountArtifacts = useCallback(async () => {
    const account = getBCSCState().account.profile

    if (account) {
      // Delete IAS account registration
      logger.info('FactoryReset: Deleting IAS account from server...')
      await deleteRegistration()

      // The PIN is found through the account, so it goes while the profile is still there
      logger.info('FactoryReset: Deleting the PIN...')
      await deletePIN({ accountId: account.accountId, issuer: account.issuer })
    } else {
      logger.info('FactoryReset: No BCSC account found')
    }

    // Clear all remaining Keychain data
    try {
      logger.info('FactoryReset: Clearing all Keychain data...')
      // Through the store, which keeps its encryption key; bcsc-core's clear alone would make it unreadable
      await storage.clearKeychain()
    } catch (error) {
      const err = error as { message?: string; code?: string; userInfo?: unknown } | undefined
      logger.warn('FactoryReset: Failed to clear Keychain data', {
        message: err?.message,
        code: err?.code,
        userInfo: err?.userInfo,
      })
    }
  }, [deleteRegistration, logger])

  /**
   * Performs a factory reset of the BCSC account and state.
   *
   * @returns {Promise<FactoryResetResult>} A promise that resolves to the result of the factory reset operation.
   */
  const factoryReset = useCallback(async (): Promise<FactoryResetResult> => {
    try {
      if (!client) {
        throw new Error('FactoryReset: BCSCApiClient is not initialized')
      }

      logger.info('FactoryReset: Starting BCSC factory reset process...')

      // Tear the agent down before clearing keys/state: if keys were cleared first,
      // re-onboarding would derive a new wallet key and the next agent init would
      // trip on the stale on-disk wallet (duplicate-store error, code 3).
      // teardownAgent shuts down before deleting (deleting first leaves the agent's
      // askar context pointing at a removed store, so its shutdown's onCloseContext
      // throws "There is no open store"), nulls the provider's agent reference, and
      // is itself best-effort/non-throwing. Both ops route through the agent-service
      // wallet-op queue, so they never race the shutdown the provider fires on
      // DID_AUTHENTICATE -> false unmount (also idempotent).
      if (agentCtx?.agent) {
        logger.info('FactoryReset: Tearing down agent and wallet store...')
        await agentCtx.teardownAgent()
      } else if (walletKey) {
        // No live agent, but a reset may have been interrupted mid-rebuild and
        // left an on-disk store keyed with this about-to-be-cleared key. Purge
        // it via a throwaway agent (delete is by file URI) or it orphans a store
        // no future key can open, failing agent init on every later launch.
        try {
          logger.info('FactoryReset: No active agent; purging any orphaned wallet store...')
          await purgeWalletStore({
            ledgers: ledgerResolver.ledgers,
            walletSecret: { id: WALLET_ID, key: walletKey },
            mediatorUrl: preferences.selectedMediator,
            walletLabel: preferences.walletName || 'BC Wallet',
            enableProxy: developer.enableProxy,
            proxyBaseUrl: Config.INDY_VDR_PROXY_URL,
            logger,
          })
        } catch (err) {
          logger.warn('FactoryReset: orphaned wallet store purge failed; wallet file may persist', { error: err })
        }
      } else {
        logger.info('FactoryReset: No active agent or wallet key; skipping wallet store delete')
      }

      await removeAccountArtifacts()

      // The account's records. hasAccount first, so RootStack goes to onboarding before verified or the
      // tokens change: either on its own would remount MainStack (or start an agent) against the wallet this
      // reset is deleting. Then the app flags straight away, which CLEAR_BCSC cleared in the same step, and the
      // media captured for the old account. The writes are settled rather than awaited in turn: one that fails
      // is logged, and the memory clears and logout below still run, since onboarding is already showing.
      const { account, app, verification, session } = getBCSCState()
      await account.removeProfile()
      session.clearMedia()
      const cleared = await Promise.allSettled([
        app.clear(),
        deleteSecureData(),
        account.setCredentialMetadata(undefined),
        verification.setCardProcess(undefined),
      ])
      for (const outcome of cleared) {
        if (outcome.status === 'rejected') {
          logger.error('FactoryReset: Failed to clear stored state', outcome.reason as Error)
        }
      }

      // The PIN is gone with the account, so its wrong attempts must not follow the next one.
      // Only once the account is removed: a reset that fails part-way keeps the lock.
      await clearPinAttempts(logger)

      // The session last. hasAccount went false above, before clearSecureState resets inVerifyFlow:
      // RootStack short-circuits to OnboardingStack on `hasAccount === false` before it ever derives
      // showVerifyStack, which prevents the transient MainStack mount that let Bifold's provider tree fire
      // storage reads against the wallet store this reset just deleted.
      logger.info('FactoryReset: Clearing secure and plain BCSC state...')
      clearSecureState()

      client.clearTokens()

      logger.info('FactoryReset: Logging out user...')
      getBCSCState().session.setDidAuthenticate(false)

      // Factory reset complete
      logger.info('FactoryReset: BCSC factory reset completed successfully')
      return { success: true }
    } catch (error) {
      const factoryResetError = _formatFactoryResetError(error)
      logger.error(factoryResetError.message)

      return { success: false, error: factoryResetError }
    }
  }, [
    removeAccountArtifacts,
    deleteSecureData,
    logger,
    clearSecureState,
    client,
    agentCtx,
    walletKey,
    preferences.selectedMediator,
    preferences.walletName,
    developer.enableProxy,
  ])

  return factoryReset
}

/**
 * Formats errors that occur during the factory reset process.
 *
 * @param {unknown} error - The error to format.
 * @returns {*} {Error} The formatted error.
 */
function _formatFactoryResetError(error: unknown): Error {
  if (error instanceof Error) {
    error.message = `FactoryResetError: ${error.message}`
    return error
  }

  return new Error(`FactoryResetUnknownError: ${JSON.stringify(error, null, 2)}`)
}
