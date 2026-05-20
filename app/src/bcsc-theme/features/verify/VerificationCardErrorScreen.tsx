import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { CommonActions, RouteProp, useRoute } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, View } from 'react-native'
import { BCSCScreens, BCSCVerifyStackParams } from '../../types/navigators'
import { VerificationCardError } from './verificationCardError'

export { VerificationCardError }

const GET_BCSC_URL = 'https://www2.gov.bc.ca/gov/content?id=98CEBFB7201143378046AC4AE5F0B9DE'

interface VerificationCardErrorScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationCardError>
}

const VerificationCardErrorScreen = ({ navigation }: VerificationCardErrorScreenProps) => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
  const { params } = useRoute<RouteProp<BCSCVerifyStackParams, BCSCScreens.VerificationCardError>>()

  const errorType = params.errorType

  if (errorType === VerificationCardError.CardExpired) {
    const controls = (
      <ControlContainer>
        <Button
          title={t('BCSC.VerificationCardError.CardExpired.ButtonText')}
          accessibilityLabel={t('BCSC.VerificationCardError.CardExpired.ButtonText')}
          accessibilityHint={t('Global.A11y.OpensInBrowser')}
          testID={testIdWithKey('GetBCSC')}
          buttonType={ButtonType.Primary}
          onPress={() => Linking.openURL(GET_BCSC_URL)}
        />
      </ControlContainer>
    )

    return (
      <ScreenWrapper
        padded={false}
        controls={controls}
        scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
      >
        <ThemedText variant={'headingThree'}>{t('BCSC.VerificationCardError.CardExpired.Heading')}</ThemedText>
        <ThemedText>{t('BCSC.VerificationCardError.CardExpired.Description')}</ThemedText>
      </ScreenWrapper>
    )
  }

  const controls = (
    <ControlContainer>
      <Button
        title={t('BCSC.MismatchedSerial.TryAnotherCard')}
        accessibilityLabel={t('BCSC.MismatchedSerial.TryAnotherCard')}
        testID={testIdWithKey('TryAnother')}
        buttonType={ButtonType.Primary}
        onPress={() => {
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.ManualSerial }] }))
        }}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      controls={controls}
      padded={false}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.MismatchedSerial.Heading')}</ThemedText>
      <ThemedText>{t('BCSC.MismatchedSerial.Description1')}</ThemedText>
      <View>
        <ThemedText variant={'bold'}>
          {t('BCSC.MismatchedSerial.SerialNumber', { serial: store.bcscSecure.serial })}
        </ThemedText>
        <ThemedText variant={'bold'}>
          {t('BCSC.MismatchedSerial.Birthdate', {
            birthdate: store.bcscSecure.birthdate?.toLocaleString(t('BCSC.LocaleStringFormat'), {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
          })}
        </ThemedText>
      </View>
      <ThemedText>{t('BCSC.MismatchedSerial.Description2')}</ThemedText>
    </ScreenWrapper>
  )
}
export default VerificationCardErrorScreen
