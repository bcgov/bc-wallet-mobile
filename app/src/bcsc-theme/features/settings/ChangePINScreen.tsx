import { ChangePINForm } from '@/bcsc-theme/components/ChangePINForm'
import { PINEntryForm } from '@/bcsc-theme/components/PINEntryForm'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TOKENS, useServices } from '@bifold/core'
import { RouteProp, useRoute } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'
import { AccountSecurityMethod, canPerformDeviceAuthentication, setAccountSecurityMethod } from 'react-native-bcsc-core'

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
  const route = useRoute<RouteProp<BCSCMainStackParams, BCSCScreens.MainChangePIN>>()

  // Check if we're changing an existing PIN or switching from Device Auth
  const isChangingExistingPIN = route.params?.isChangingExistingPIN ?? false

  // Handler for when user is changing their existing PIN
  const handleChangePINSuccess = useCallback(async () => {
    logger.info('PIN changed successfully')

    Alert.alert(t('BCSC.Settings.ChangePIN.SuccessTitle'), t('BCSC.Settings.ChangePIN.PINChanged'), [
      {
        text: t('Global.OK'),
        onPress: () => {
          navigation.goBack()
        },
      },
    ])
  }, [logger, navigation, t])

  // Handler for when user is switching from Device Auth to PIN
  const handleCreatePINSuccess = useCallback(async () => {
    const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
    await setAccountSecurityMethod(
      isDeviceAuthAvailable ? AccountSecurityMethod.PinWithDeviceAuth : AccountSecurityMethod.PinNoDeviceAuth
    )

    logger.info('Switched to PIN security method')

    Alert.alert(t('BCSC.Settings.AppSecurity.SuccessTitle'), t('BCSC.Settings.AppSecurity.SwitchedToPIN'), [
      {
        text: t('Global.OK'),
        onPress: () => {
          // Navigate back to settings, popping both ChangePIN and AppSecurity screens
          navigation.pop(2)
        },
      },
    ])
  }, [logger, navigation, t])

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
