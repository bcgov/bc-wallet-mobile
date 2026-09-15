import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { navigationRef } from '@/contexts/NavigationContainerContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'

/**
 * Wraps a single device-authorization call: on that specific conflict, if the reset really was a
 * no-op, cycles the IAS registration and retries the call once.
 * Every other error, and the case where the global policy already moved the user elsewhere
 * passes through unchanged.
 */
export const useDeviceAuthorizationRecovery = () => {
  const { cycleRegistration } = useRegistrationService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const attemptWithRecovery = useCallback(
    async <T>(action: () => Promise<T>, originScreen: string): Promise<T> => {
      try {
        return await action()
      } catch (firstError) {
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

        await cycleRegistration()

        return await action()
      }
    },
    [cycleRegistration, logger]
  )

  return attemptWithRecovery
}

export default useDeviceAuthorizationRecovery
