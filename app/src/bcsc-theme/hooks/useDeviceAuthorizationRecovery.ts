import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { navigationRef } from '@/contexts/NavigationContainerContext'
import { isAppError } from '@/errors/appError'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useSyncExternalStore } from 'react'

// Module state rather than component state
// the error handling in useResidentialAddressModel and EnterBirthdateScreen can
// remount the component before the recovery call even starts, reseting local load state.
// This module state survives that remount, so the UI can reflect that work is still in progress.
let isRecovering = false
const listeners = new Set<() => void>()

const setRecovering = (value: boolean) => {
  if (isRecovering === value) {
    return
  }
  isRecovering = value
  listeners.forEach((listener) => listener())
}

const subscribeToRecovery = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getRecoverySnapshot = () => isRecovering

export const useIsDeviceAuthorizationRecovering = () => useSyncExternalStore(subscribeToRecovery, getRecoverySnapshot)

/**
 * Wraps a single device-authorization call, with two recoveries:
 * - Device account exists but was never registered with the server: registers it, then retries once.
 *   `ensureRegistered` alerts on its own failure; that error and any retry failure pass through unchanged.
 * - Device already registered conflict: if the reset really was a no-op, cycles the IAS registration
 *   and retries the call once.
 * No device account at all is alerted, marked handled and rethrown, never auto-registered.
 * Every other error, and the case where the global policy already moved the user elsewhere,
 * passes through unchanged.
 */
export const useDeviceAuthorizationRecovery = () => {
  const { cycleRegistration, ensureRegistered } = useRegistrationService()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { accountNotFoundAlert } = useAlerts(navigation)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const attemptWithRecovery = useCallback(
    async <T>(action: () => Promise<T>, originScreen: string): Promise<T> => {
      try {
        return await action()
      } catch (firstError) {
        if (isAppError(firstError, AppEventCode.ACCOUNT_NOT_FOUND)) {
          if (!firstError.handled) {
            accountNotFoundAlert(firstError)
          }
          firstError.handled = true
          throw firstError
        }

        // Temporary account: the first server call is where a device that failed setup registers
        if (isAppError(firstError, AppEventCode.ACCOUNT_NOT_REGISTERED)) {
          setRecovering(true)
          try {
            await ensureRegistered()
            return await action()
          } finally {
            setRecovering(false)
          }
        }

        // Error is not a registration error, throw as normal
        const appError = ensureAppError(firstError, AppEventCode.DEVICE_AUTHORIZATION_ERROR)
        if (appError.appEvent !== AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST) {
          throw firstError
        }

        // The global error policy already reset navigation before this catch runs. If it moved us
        // off originScreen, nothing left to do here.
        const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined
        if (currentRoute !== undefined && currentRoute !== originScreen) {
          throw firstError
        }

        logger.warn('[DeviceAuthorizationRecovery] already-registered conflict, attempting registration cycle', {
          originScreen,
        })

        setRecovering(true)
        try {
          await cycleRegistration()
          return await action()
        } catch (retryError) {
          // Recovery has failed, mark error as unhandled and rethrow
          const retryAppError = ensureAppError(retryError, AppEventCode.DEVICE_AUTHORIZATION_ERROR)
          retryAppError.handled = false
          throw retryAppError
        } finally {
          setRecovering(false)
        }
      }
    },
    [accountNotFoundAlert, cycleRegistration, ensureRegistered, logger]
  )

  return attemptWithRecovery
}

export default useDeviceAuthorizationRecovery
