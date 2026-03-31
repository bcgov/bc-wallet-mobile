import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import NicknameForm from './components/NicknameForm'

const EditNicknameScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const [store, dispatch] = useStore<BCState>()
  const registration = useRegistrationService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleSubmit = useCallback(
    async (trimmedNickname: string) => {
      try {
        await registration.updateRegistration(store.bcscSecure.registrationAccessToken, trimmedNickname)
      } catch (apiError) {
        logger.error('Failed to update registration', { error: apiError })
        throw apiError
      }

      // only dispatch if the API is successful
      dispatch({
        type: BCDispatchAction.UPDATE_NICKNAME,
        payload: [{ nickname: store.bcsc.selectedNickname, newNickname: trimmedNickname }],
      })
      dispatch({
        type: BCDispatchAction.SELECT_ACCOUNT,
        payload: [trimmedNickname],
      })

      navigation.goBack()
    },
    [dispatch, store.bcsc.selectedNickname, store.bcscSecure.registrationAccessToken, navigation, registration, logger]
  )

  return <NicknameForm onSubmit={handleSubmit} isRenaming />
}

export default EditNicknameScreen
