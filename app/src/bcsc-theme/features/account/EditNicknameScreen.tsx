import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { useAccount } from '@/bcsc-theme/storage/hooks'
import { TOKENS, useServices } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import NicknameForm from './components/NicknameForm'

const EditNicknameScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const { tokens, updateProfile } = useAccount()
  const registrationAccessToken = tokens?.registrationAccessToken
  const registration = useRegistrationService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleSubmit = useCallback(
    async (trimmedNickname: string) => {
      try {
        await registration.updateRegistration(registrationAccessToken, trimmedNickname)
      } catch (apiError) {
        logger.error('Failed to update registration', { error: apiError })
        throw apiError
      }

      // Only once the server has it
      await updateProfile({ nickname: trimmedNickname })

      navigation.goBack()
    },
    [registrationAccessToken, updateProfile, navigation, registration, logger]
  )

  return <NicknameForm onSubmit={handleSubmit} isRenaming />
}

export default EditNicknameScreen
