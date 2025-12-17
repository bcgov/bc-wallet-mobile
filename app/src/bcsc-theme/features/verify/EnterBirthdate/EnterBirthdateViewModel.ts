import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCCardProcess } from '@/bcsc-theme/types/cards'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'

/**
 * EnterBirthdateViewmodel - Handles business logic for authorizing a device based on manually entered CSN + birthdate
 */
export const useEnterBirthdateViewModel = (
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterBirthdate>
) => {
  const [store, dispatch] = useStore<BCState>()
  const { authorization } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const authorizeDevice = useCallback(
    async (serial: string, date: Date) => {
      dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [date] })
      const deviceAuth = await authorization.authorizeDevice(serial, date)

      // Device already authorized
      if (deviceAuth === null) {
        logger.info('Device already authorized, navigating to SetupSteps screen')
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
        return
      }

      // Store authorization data
      const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
      dispatch({
        type: BCDispatchAction.UPDATE_EMAIL,
        payload: [{ email: deviceAuth.verified_email, emailConfirmed: !!deviceAuth.verified_email }],
      })
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [deviceAuth.device_code] })
      dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [deviceAuth.user_code] })
      dispatch({ type: BCDispatchAction.UPDATE_CARD_PROCESS, payload: [deviceAuth.process] })
      dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })
      dispatch({
        type: BCDispatchAction.UPDATE_VERIFICATION_OPTIONS,
        payload: [deviceAuth.verification_options.split(' ')],
      })

      logger.info(`Device authorized successfully, proceeding to verification steps: ${deviceAuth.process}`)

      // Navigate based on card process
      if (deviceAuth.process === BCSCCardProcess.BCSCPhoto) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
      } else {
        navigation.navigate(BCSCScreens.AdditionalIdentificationRequired)
      }
    },
    [dispatch, authorization, navigation, logger]
  )

  return {
    serial: store.bcsc.serial,
    initialDate: store.bcsc.birthdate,
    authorizeDevice,
  }
}
