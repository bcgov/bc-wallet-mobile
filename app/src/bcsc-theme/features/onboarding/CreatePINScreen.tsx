import { PINEntryForm, PINEntryResult } from '@/bcsc-theme/features/auth/components/PINEntryForm'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'

interface CreatePINScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingCreatePIN>
}

export const CreatePINScreen: React.FC<CreatePINScreenProps> = () => {
  const { handleSuccessfulAuth } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handlePINSuccess = useCallback(
    async (result: PINEntryResult) => {
      await handleSuccessfulAuth(result.walletKey)
      logger.info('PIN set successfully and onboarding completed')
    },
    [handleSuccessfulAuth, logger]
  )

  return (
    <PINEntryForm
      onSuccess={handlePINSuccess}
      // Completing auth swaps the root, which slides this screen out with the button still spinning
      keepLoadingOnSuccess
      translationPrefix="BCSC.PIN"
      creatingNewPIN={true}
    />
  )
}
