import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useAuthentication } from '@/bcsc-theme/hooks/useAuthentication'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  CheckBoxRow,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { setHideDeviceAuthPrepFlag } from 'react-native-bcsc-core'

interface ConfirmDeviceAuthInfoScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.DeviceAuthInfo>
}

export const ConfirmDeviceAuthInfoScreen: React.FC<ConfirmDeviceAuthInfoScreenProps> = ({
  navigation,
}: ConfirmDeviceAuthInfoScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const [checked, setChecked] = useState(false)
  const { performDeviceAuth } = useAuthentication(navigation)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const onPressContinue = useCallback(async () => {
    if (checked) {
      try {
        await setHideDeviceAuthPrepFlag(true)
      } catch (error) {
        // non-fatal error, just log it - the app can still function without this flag being set,
        // it just won't hide the prep screen on next auth
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Failed to set hide device auth prep flag: ${errorMsg}`)
      }
    }
    performDeviceAuth()
  }, [checked, performDeviceAuth, logger])

  const controls = (
    <>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <CheckBoxRow
          title={t('BCSC.ConfirmDeviceAuth.CheckboxLabel')}
          accessibilityLabel={t('BCSC.ConfirmDeviceAuth.CheckboxLabel')}
          testID={testIdWithKey('HideConfirmationCheckbox')}
          checked={checked}
          onPress={() => setChecked(!checked)}
          reverse
          titleStyle={{ textAlign: 'right' }}
        />
      </View>
      <ControlContainer>
        <Button
          buttonType={ButtonType.Primary}
          title={t('Global.Continue')}
          accessibilityLabel={t('Global.Continue')}
          testID={testIdWithKey('Continue')}
          onPress={onPressContinue}
        />
      </ControlContainer>
    </>
  )

  return (
    <ScreenWrapper
      padded={false}
      keyboardActive
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.ConfirmDeviceAuth.Title')}</ThemedText>
      <ThemedText>{t('BCSC.ConfirmDeviceAuth.Description1')}</ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.ConfirmDeviceAuth.Description2')}</ThemedText>
    </ScreenWrapper>
  )
}
