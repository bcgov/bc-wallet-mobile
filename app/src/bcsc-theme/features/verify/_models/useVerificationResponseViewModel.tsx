import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { useTokenService } from '@/bcsc-theme/services/hooks/useTokenService'
import { getShortDisplayName } from '@/bcsc-theme/utils/account-utils'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useState } from 'react'

const useVerificationResponseViewModel = () => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const registration = useRegistrationService()
  const { getCachedIdTokenMetadata } = useTokenService()
  const { updateVerified, updateUserMetadata, clearAuthorizationRequest } = useSecureActions()
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
      // fallback to family_name to support mononyms
      const nickname = getShortDisplayName(token ?? {})
      // update local store with nickname
      updateNicknameInLocalStorage(nickname)
      // this updates their registration status with their nickname and new access tokens
      await handleUpdateRegistration(nickname)
      // this marks their account as verified, so we know to navigate them to the correct stack
      await updateVerified(true)
      // account setup is complete, clear the authorization request record
      await clearAuthorizationRequest()

      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: [undefined] })
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE, payload: [undefined] })
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_VIDEO_SUBMITTED_AT, payload: [undefined] })
      setIsSettingUpAccount(false)
      // RootStack swaps to MainStack on `verified` flip — no imperative navigate needed (#4368)
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[handleAccountSetup] Failed to clean up verification process: ${errMessage}`)
      setIsSettingUpAccount(false)
    }
  }, [
    updateVerified,
    updateUserMetadata,
    clearAuthorizationRequest,
    handleUpdateRegistration,
    getCachedIdTokenMetadata,
    logger,
    updateNicknameInLocalStorage,
    dispatch,
  ])
  return {
    isSettingUpAccount,
    handleAccountSetup,
  }
}

export default useVerificationResponseViewModel
