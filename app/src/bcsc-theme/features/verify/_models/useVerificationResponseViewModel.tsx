import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { useTokenService } from '@/bcsc-theme/services/hooks/useTokenService'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useState } from 'react'

const useVerificationResponseViewModel = () => {
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
      dispatch({ type: BCDispatchAction.ADD_NICKNAME, payload: [nickname] })
      dispatch({ type: BCDispatchAction.SELECT_ACCOUNT, payload: [nickname] })
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
      // update local store with nickname
      updateNicknameInLocalStorage(token.given_name)
      // this updates their registration status with their nickname and new access tokens
      await handleUpdateRegistration(token.given_name)
      // this marks their account as verified, so we know to navigate them to the correct stack
      await updateVerified(true)
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[handleAccountSetup] Failed to clean up verification process: ${errMessage}`)
    } finally {
      setIsSettingUpAccount(false)
    }
  }, [
    updateVerified,
    updateUserMetadata,
    handleUpdateRegistration,
    getCachedIdTokenMetadata,
    logger,
    updateNicknameInLocalStorage,
  ])
  return {
    isSettingUpAccount,
    handleAccountSetup,
  }
}

export default useVerificationResponseViewModel
