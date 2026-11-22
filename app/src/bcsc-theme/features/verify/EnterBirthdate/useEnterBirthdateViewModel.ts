import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { useDeviceAuthorizationRecovery } from '@/bcsc-theme/hooks/useDeviceAuthorizationRecovery'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { useAuthorizationService } from '@/bcsc-theme/services/hooks/useAuthorizationService'
import { selectJourney, VerificationJourney } from '@/bcsc-theme/state/verification/journey'
import { getBCSCState, useBirthdate, useVerification } from '@/bcsc-theme/storage/hooks'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { getResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { TOKENS, useServices } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'

/**
 * useEnterBirthdateViewModel - Handles business logic for authorizing a device based on manually entered CSN + birthdate
 */
export const useEnterBirthdateViewModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterBirthdate>
) => {
  const { request } = useVerification()
  const storedSerial = request?.csn
  const initialDate = useBirthdate()
  const authorizationService = useAuthorizationService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateUserInfo, updateDeviceCodes, updateCardProcess, updateVerificationOptions } = useSecureActions()
  const attemptWithRecovery = useDeviceAuthorizationRecovery()

  const authorizeDevice = useCallback(
    async (serial: string, date: Date) => {
      await updateUserInfo({ birthdate: date })
      const deviceAuth = await attemptWithRecovery(
        () => authorizationService.authorizeDevice(serial, date),
        BCSCScreens.EnterBirthdate
      )

      // Store authorization data
      const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
      await updateUserInfo({
        email: deviceAuth.verified_email,
        isEmailVerified: !!deviceAuth.verified_email,
      })
      await updateDeviceCodes({
        deviceCode: deviceAuth.device_code,
        userCode: deviceAuth.user_code,
        deviceCodeExpiresAt: expiresAt,
      })
      await updateCardProcess(deviceAuth.process)
      await updateVerificationOptions(deviceAuth.verification_options.split(' ') as DeviceVerificationOption[])

      logger.info(`Device authorized successfully, proceeding to verification steps: ${deviceAuth.process}`)

      // The writes above are in the store already; the prediction pins the values the route depends on
      const predictedJourney: VerificationJourney = {
        ...selectJourney(getBCSCState()),
        serial,
        emailAddress: deviceAuth.verified_email,
        isEmailVerified: !!deviceAuth.verified_email,
        deviceCode: deviceAuth.device_code,
        cardProcess: deviceAuth.process,
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [getResumeStepRoute(predictedJourney)],
        })
      )
    },
    [
      authorizationService,
      attemptWithRecovery,
      navigation,
      logger,
      updateUserInfo,
      updateDeviceCodes,
      updateCardProcess,
      updateVerificationOptions,
    ]
  )

  const isDateValid = (value: string): boolean => {
    const withoutSeparators = value.split('/').join('')
    if (withoutSeparators.length !== 8) {
      return true // allow partial input without showing an error
    }
    const regex = /^\d{4}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/
    if (!regex.test(value)) {
      return false
    }

    const [year, month, day] = value.split('/').map(Number)
    const parsedDate = new Date(year, month - 1, day)
    const isValidDate =
      parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day

    return isValidDate
  }

  return {
    serial: storedSerial,
    initialDate,
    authorizeDevice,
    isDateValid,
  }
}
