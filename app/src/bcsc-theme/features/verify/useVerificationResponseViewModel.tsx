import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { useTokenService } from '@/bcsc-theme/services/hooks/useTokenService'
import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { getShortDisplayName } from '@/bcsc-theme/utils/account-utils'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useState } from 'react'

const useVerificationResponseViewModel = () => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const registration = useRegistrationService()
  const { getCachedIdTokenMetadata } = useTokenService()
  const { updateVerified, updateUserMetadata, clearAuthorizationRequest } = useSecureActions()
  const [isSettingUpAccount, setIsSettingUpAccount] = useState(false)

  const handleUpdateRegistration = useCallback(
    async (nickname: string) => {
      try {
        await registration.updateRegistration(nickname)
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error)
        logger.error(`[handleUpdateRegistration] Failed to update registration: ${errMessage}`)
      }
    },
    [registration, logger]
  )

  // Also when the server update failed: the account record keeps the nickname for the next attempt
  const updateNicknameInLocalStorage = useCallback(
    async (nickname: string) => {
      try {
        await getBCSCState().account.updateProfile({ nickname })
      } catch (error) {
        logger.error('[updateNicknameInLocalStorage] Failed to save nickname', error as Error)
      }
    },
    [logger]
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
      await updateNicknameInLocalStorage(nickname)
      // this updates their registration status with their nickname and new access tokens
      await handleUpdateRegistration(nickname)
      // this marks their account as verified, so we know to navigate them to the correct stack
      await updateVerified(true)
      // account setup is complete, clear the authorization request record
      await clearAuthorizationRequest()

      getBCSCState().session.update({
        verificationRequestStatus: undefined,
        verificationRequestStatusMessage: undefined,
        verificationVideoSubmittedAt: undefined,
      })
      setIsSettingUpAccount(false)
      // No imperative navigate: the `verified` flip swaps VerifyStack for MainStack (#4368), and MainStack
      // stops registering this screen once verified, so neither host is left showing it (#4719)
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
  ])
  return {
    isSettingUpAccount,
    handleAccountSetup,
  }
}

export default useVerificationResponseViewModel
