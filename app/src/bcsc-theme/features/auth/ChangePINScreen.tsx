import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { ChangePINForm } from '@/bcsc-theme/features/auth/components/ChangePINForm'
import { PINEntryForm } from '@/bcsc-theme/features/auth/components/PINEntryForm'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TOKENS, useServices } from '@bifold/core'
import { RouteProp, useRoute } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountSecurityMethod, canPerformDeviceAuthentication, setAccountSecurityMethod } from 'react-native-bcsc-core'
import Toast from 'react-native-toast-message'

interface ChangePINScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainChangePIN>
}

/**
 * Change PIN screen for settings.
 * Handles two use cases:
 * 1. Switching from Device Auth to PIN (isChangingExistingPIN = false/undefined)
 *    - Uses PINEntryForm (new PIN + confirm)
 * 2. Changing an existing PIN (isChangingExistingPIN = true)
 *    - Uses ChangePINForm (current PIN + new PIN + confirm)
 */
export const ChangePINScreen: React.FC<ChangePINScreenProps> = ({ navigation }: ChangePINScreenProps) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { stopLoading } = useLoadingScreen()
  const route = useRoute<RouteProp<BCSCMainStackParams, BCSCScreens.MainChangePIN>>()

  // Check if we're changing an existing PIN or switching from Device Auth
  const isChangingExistingPIN = route.params?.isChangingExistingPIN ?? false

  // Handler for when user is changing their existing PIN
  const handleChangePINSuccess = useCallback(async () => {
    logger.info('PIN changed successfully')
    navigation.goBack()
    stopLoading()

    Toast.show({
      type: 'success',
      text1: t('BCSC.Settings.ChangePIN.SuccessTitle'),
      text2: t('BCSC.Settings.ChangePIN.PINChanged'),
      position: 'bottom',
    })
  }, [logger, navigation, stopLoading, t])

  // Handler for when user is switching from Device Auth to PIN
  const handleCreatePINSuccess = useCallback(async () => {
    const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
    await setAccountSecurityMethod(
      isDeviceAuthAvailable ? AccountSecurityMethod.PinWithDeviceAuth : AccountSecurityMethod.PinNoDeviceAuth
    )

    logger.info('Switched to PIN security method')
    // Navigate back to settings, popping both ChangePIN and AppSecurity screens
    navigation.pop(2)
    stopLoading()

    Toast.show({
      type: 'success',
      text1: t('BCSC.Settings.AppSecurity.SuccessTitle'),
      text2: t('BCSC.Settings.AppSecurity.SwitchedToPIN'),
      position: 'bottom',
    })
  }, [logger, navigation, stopLoading, t])

  // Render ChangePINForm when changing existing PIN, PINEntryForm when switching from Device Auth
  if (isChangingExistingPIN) {
    return <ChangePINForm onSuccess={handleChangePINSuccess} loadingMessage={t('BCSC.ChangePIN.ChangingPIN')} />
  }

  return (
    <PINEntryForm
      onSuccess={handleCreatePINSuccess}
      loadingMessage={t('BCSC.PIN.SettingUpPIN')}
      translationPrefix="BCSC.PIN"
    />
  )
}
