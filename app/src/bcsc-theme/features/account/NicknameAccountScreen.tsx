import React, { useCallback } from 'react'

import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions, useNavigation } from '@react-navigation/native'
import NicknameForm from './components/NicknameForm'

const NicknameAccountScreen: React.FC = () => {
  const navigation = useNavigation()
  const [store, dispatch] = useStore<BCState>()
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleSubmit = useCallback(
    async (trimmedNickname: string) => {
      dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [trimmedNickname] })
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [trimmedNickname] })
      try {
        await registration.updateRegistration(store.bcscSecure.registrationAccessToken, trimmedNickname)
      } catch (apiError) {
        // Don't throw error to allow navigation to proceed even if API call fails (nickname in registration is not critical)
        logger.error('Failed to update registration', { error: apiError })
      }
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] }))
    },
    [dispatch, navigation, logger, registration, store.bcscSecure.registrationAccessToken]
  )

  return <NicknameForm onSubmit={handleSubmit} />
}

export default NicknameAccountScreen
