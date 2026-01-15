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

export const ConfirmDeviceAuthInfoScreen: React.FC<ConfirmDeviceAuthInfoScreenProps> = () => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const [checked, setChecked] = useState(false)
  const [, dispatch] = useStore<BCState>()

  const onPressContinue = useCallback(() => {
    dispatch({ type: BCDispatchAction.HIDE_DEVICE_AUTH_CONFIRMATION })
  }, [dispatch])

  const controls = (
    <>
      <CheckBoxRow
        title={t('Preface.Confirmed')}
        accessibilityLabel={t('Terms.IAgree')}
        testID={testIdWithKey('IAgree')}
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
    // TODO (bm): the keyboardActive prop is somehow preventing the checkbox from disappearing. without it, the checkbox just vanishes
    <ScreenWrapper keyboardActive controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{`Confirm it's your device`}</ThemedText>
      <ThemedText>{`Each time you open this app you'll be asked for the passcode you regularly use to unlock your device. Or for Touch ID or Face ID if you use it.`}</ThemedText>
      <ThemedText
        variant={'bold'}
      >{`Your passcode, Touch ID, or Face ID never leaves this device. It's never shared with this app.`}</ThemedText>
    </ScreenWrapper>
  )
}
