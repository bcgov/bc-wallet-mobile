import { useAuthentication } from '@/bcsc-theme/hooks/useAuthentication'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  CheckBoxRow,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmDeviceAuthInfoScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.DeviceAuthInfo>
}

export const ConfirmDeviceAuthInfoScreen: React.FC<ConfirmDeviceAuthInfoScreenProps> = ({
  navigation,
}: ConfirmDeviceAuthInfoScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const [checked, setChecked] = useState(false)
  const [, dispatch] = useStore<BCState>()
  const { performDeviceAuth } = useAuthentication(navigation)

  const onPressContinue = useCallback(() => {
    if (checked) {
      dispatch({ type: BCDispatchAction.HIDE_DEVICE_AUTH_CONFIRMATION, payload: [true] })
    }
    performDeviceAuth()
  }, [checked, dispatch, performDeviceAuth])

  const controls = (
    <>
      <CheckBoxRow
        title={t('BCSC.ConfirmDeviceAuth.CheckboxLabel')}
        accessibilityLabel={t('BCSC.ConfirmDeviceAuth.CheckboxLabel')}
        testID={testIdWithKey('HideConfirmationCheckbox')}
        checked={checked}
        onPress={() => setChecked(!checked)}
        reverse
        titleStyle={{ textAlign: 'right' }}
      />
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
        onPress={onPressContinue}
      />
    </>
  )

  return (
    <ScreenWrapper keyboardActive controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.ConfirmDeviceAuth.Title')}</ThemedText>
      <ThemedText>{t('BCSC.ConfirmDeviceAuth.Description1')}</ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.ConfirmDeviceAuth.Description2')}</ThemedText>
    </ScreenWrapper>
  )
}
