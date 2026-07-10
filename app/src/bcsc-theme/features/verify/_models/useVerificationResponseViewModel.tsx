import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { useTokenService } from '@/bcsc-theme/services/hooks/useTokenService'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'

const useVerificationResponseViewModel = () => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const registration = useRegistrationService()
  const { getCachedIdTokenMetadata } = useTokenService()
  const { updateVerified, updateUserMetadata } = useSecureActions()
  const [isSettingUpAccount, setIsSettingUpAccount] = useState(false)

  const handleUpdateRegistration = useCallback(
    async (nickname: string) => {
      try {
        await registration.updateRegistration(store.bcscSecure.registrationAccessToken, nickname)
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error)
        logger.error(`[handleUpdateRegistration] Failed to update registration: ${errMessage}`)
      }
    },
    [store.bcscSecure.registrationAccessToken, registration, logger]
  )

  const updateNicknameInLocalStorage = useCallback(
    (nickname: string) => {
      dispatch({ type: BCDispatchAction.UPDATE_NICKNAME, payload: [nickname] })
    },
    [dispatch]
  )

  const handleAccountSetup = useCallback(async () => {
    setIsSettingUpAccount(true)
    try {
      // this cleans up old metadata from the verification process (photos, address etc.)
      await updateUserMetadata(null)
      // force a token exchange so the backend activates the device registration before navigation
      const token = await getCachedIdTokenMetadata({ refreshCache: true })
      // fallback to family_name to support mononymns
      const nickname = token?.given_name || token?.family_name
      // update local store with nickname
      updateNicknameInLocalStorage(nickname)
      // this updates their registration status with their nickname and new access tokens
      await handleUpdateRegistration(nickname)
      // this marks their account as verified, so we know to navigate them to the correct stack
      await updateVerified(true)
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: [undefined] })
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE, payload: [undefined] })
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT, payload: [undefined] })
      setIsSettingUpAccount(false)
      // all done here, back to the home screen
      navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[handleAccountSetup] Failed to clean up verification process: ${errMessage}`)
      setIsSettingUpAccount(false)
    }
  }, [
    updateVerified,
    updateUserMetadata,
    handleUpdateRegistration,
    getCachedIdTokenMetadata,
    logger,
    updateNicknameInLocalStorage,
    navigation,
    dispatch,
  ])
  return {
    isSettingUpAccount,
    handleAccountSetup,
  }
}

export default useVerificationResponseViewModel
