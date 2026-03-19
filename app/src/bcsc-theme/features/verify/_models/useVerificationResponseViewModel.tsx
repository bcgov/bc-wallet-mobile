import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { useTokenService } from '@/bcsc-theme/services/hooks/useTokenService'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useState } from 'react'

const useVerificationResponseViewModel = () => {
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const registration = useRegistrationService()
  const { getCachedIdTokenMetadata } = useTokenService()
  const { updateVerified, updateUserMetadata } = useSecureActions()
  const [isSettingUpAccount, setIsSettingUpAccount] = useState(false)

  const handleUpdateRegistration = useCallback(async () => {
    try {
      await registration.updateRegistration(store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname)
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[handleUpdateRegistration] Failed to update registration: ${errMessage}`)
    }
  }, [store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname, registration, logger])

  const handleAccountSetup = useCallback(async () => {
    setIsSettingUpAccount(true)
    try {
      // this cleans up old metadata from the verification process (photos, address info)
      await updateUserMetadata(null)
      // this updates their registration status with their nickname and new access tokens
      await handleUpdateRegistration()
      // force a token exchange so the backend activates the device registration before navigation
      await getCachedIdTokenMetadata({ refreshCache: true })
      // this marks their account as verified, so we know to navigate them to the correct stack
      await updateVerified(true)
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[handleAccountSetup] Failed to clean up verification process: ${errMessage}`)
    } finally {
      setIsSettingUpAccount(false)
    }
  }, [updateVerified, updateUserMetadata, handleUpdateRegistration, getCachedIdTokenMetadata, logger])
  return {
    isSettingUpAccount,
    handleAccountSetup,
  }
}

export default useVerificationResponseViewModel
