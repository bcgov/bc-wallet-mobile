import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { PINEntryForm, PINEntryResult } from '@/bcsc-theme/components/PINEntryForm'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountSecurityMethod, canPerformDeviceAuthentication } from 'react-native-bcsc-core'

interface CreatePINScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingCreatePIN>
}

/**
 * Create PIN screen for onboarding.
 * Used when setting up the app for the first time with PIN security.
 * Uses the shared PINEntryForm component.
 */
export const CreatePINScreen: React.FC<CreatePINScreenProps> = () => {
  const { t } = useTranslation()
  const { client, isClientReady } = useBCSCApiClientState()
  const { handleSuccessfulAuth } = useSecureActions()
  const { register } = useRegistrationApi(client, isClientReady)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handlePINSuccess = useCallback(
    async (result: PINEntryResult) => {
      // Register with the appropriate security method
      const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
      await register(
        isDeviceAuthAvailable ? AccountSecurityMethod.PinWithDeviceAuth : AccountSecurityMethod.PinNoDeviceAuth
      )

      // Complete onboarding with the wallet key
      await handleSuccessfulAuth(result.walletKey)
      logger.info('PIN set successfully and onboarding completed')
    },
    [handleSuccessfulAuth, logger, register]
  )

  return (
    <PINEntryForm
      onSuccess={handlePINSuccess}
      loadingMessage={t('BCSC.PIN.SettingUpAccount')}
      translationPrefix="BCSC.PIN"
    />
  )
}
