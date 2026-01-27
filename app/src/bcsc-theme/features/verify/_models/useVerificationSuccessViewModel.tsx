import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useState } from 'react'

const useVerificationSuccessViewmodel = () => {
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { registration } = useApi()
  const { updateVerified, updateUserMetadata } = useSecureActions()
  const [isSettingUpAccount, setIsSettingUpAccount] = useState(false)

  const handleUpdateRegistration = useCallback(async () => {
    try {
      const registrationAccessToken = store.bcscSecure.registrationAccessToken
      const selectedNickname = store.bcsc.selectedNickname

      if (!registrationAccessToken) {
        logger.error('Failed to update registration: missing registrationAccessToken')
        return
      }

      if (!selectedNickname) {
        logger.error('Failed to update registration: missing selectedNickname')
        return
      }

      await registration.updateRegistration(registrationAccessToken, selectedNickname)
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to update registration: ${errMessage}`)
      return
    }
  }, [registration, store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname, logger])

  const handleAccountSetup = useCallback(async () => {
    setIsSettingUpAccount(true)
    try {
      // this marks their account as verified, so we know to navigate them to the correct stack
      await updateVerified(true)
      // this cleans up old metadata from the verification process (photos, address info)
      await updateUserMetadata(null)
      // this updates their registration status with their nickname and new access tokens
      await handleUpdateRegistration()
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to clean up verification process: ${errMessage}`)
    } finally {
      setIsSettingUpAccount(false)
    }
  }, [updateVerified, updateUserMetadata, handleUpdateRegistration, logger])
  return {
    isSettingUpAccount,
    handleAccountSetup,
  }
}

export default useVerificationSuccessViewmodel
