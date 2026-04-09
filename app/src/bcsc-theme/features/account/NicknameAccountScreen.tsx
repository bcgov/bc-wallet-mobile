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
  const registration = useRegistrationService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleSubmit = useCallback(
    async (trimmedNickname: string) => {
      dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [trimmedNickname] })
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [trimmedNickname] })

      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))

      try {
        await registration.updateRegistration(store.bcscSecure.registrationAccessToken, trimmedNickname)
      } catch (apiError) {
        // Note: Updating nickname in registration is non-critical
        logger.error('Failed to update registration', apiError as Error)
      }
    },
    [dispatch, navigation, logger, registration, store.bcscSecure.registrationAccessToken]
  )

  return <NicknameForm onSubmit={handleSubmit} />
}

export default NicknameAccountScreen
