import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import NicknameForm from './components/NicknameForm'

const NicknameAccountScreen: React.FC = () => {
  const navigation = useNavigation()
  const [store, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const registrationService = useRegistrationService(registration)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleSubmit = useCallback(
    async (trimmedNickname: string) => {
      dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [trimmedNickname] })
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [trimmedNickname] })
      try {
        await registrationService.updateRegistration(store.bcscSecure.registrationAccessToken, trimmedNickname)
      } catch (apiError) {
        // Don't throw error to allow navigation to proceed even if API call fails (nickname in registration is not critical)
        logger.error('Failed to update registration', apiError as Error)
      }
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
    },
    [dispatch, navigation, registrationService, store.bcscSecure.registrationAccessToken, logger]
  )

  return <NicknameForm onSubmit={handleSubmit} />
}

export default NicknameAccountScreen
