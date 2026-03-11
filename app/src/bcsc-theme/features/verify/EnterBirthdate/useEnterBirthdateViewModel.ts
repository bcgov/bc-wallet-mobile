import useApi from '@/bcsc-theme/api/hooks/useApi'
import { DeviceVerificationOption } from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'

/**
 * useEnterBirthdateViewModel - Handles business logic for authorizing a device based on manually entered CSN + birthdate
 */
export const useEnterBirthdateViewModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterBirthdate>
) => {
  const [store] = useStore<BCState>()
  const { authorization } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateUserInfo, updateDeviceCodes, updateCardProcess, updateVerificationOptions } = useSecureActions()

  const authorizeDevice = useCallback(
    async (serial: string, date: Date) => {
      await updateUserInfo({ birthdate: date })
      const deviceAuth = await authorization.authorizeDevice(serial, date)

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

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
    },
    [authorization, navigation, logger, updateUserInfo, updateDeviceCodes, updateCardProcess, updateVerificationOptions]
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
    serial: store.bcscSecure.serial,
    initialDate: store.bcscSecure.birthdate,
    authorizeDevice,
    isDateValid,
  }
}
