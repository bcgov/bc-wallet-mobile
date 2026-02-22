import { BCState } from '@/store'
import CardNotFoundImage from '@assets/img/card_not_found_highlight.png'
import { Button, ButtonType, ScreenWrapper, ThemedText, useStore, useTheme } from '@bifold/core'
import { RouteProp, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { Image, Linking, StyleSheet, useWindowDimensions } from 'react-native'
import { BCSCScreens, BCSCVerifyStackParams } from '../../types/navigators'

export enum VerificationCardError {
  MismatchedSerial = 'MismatchedSerial',
  CardExpired = 'CardExpired',
}

const GET_BCSC_URL = 'https://www2.gov.bc.ca/gov/content?id=98CEBFB7201143378046AC4AE5F0B9DE'

const CARD_NOT_FOUND_IMAGE = Image.resolveAssetSource(CardNotFoundImage).uri

const twoThirds = 0.67

const VerificationCardErrorScreen = () => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { width } = useWindowDimensions()
  const { t } = useTranslation()
  const { params } = useRoute<RouteProp<BCSCVerifyStackParams, BCSCScreens.VerificationCardError>>()

  const errorType = params.errorType

  const styles = StyleSheet.create({
    image: {
      width: width - Spacing.md * 2,
      height: (width - Spacing.md * 2) * twoThirds,
      marginBottom: Spacing.lg,
    },
  })

  if (errorType === VerificationCardError.CardExpired) {
    return (
      <ScreenWrapper>
        <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.sm }}>
          {t('BCSC.VerificationCardError.CardExpired.Heading')}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.lg }}>
          {t('BCSC.VerificationCardError.CardExpired.Description')}
        </ThemedText>
        <Button
          title={t('BCSC.VerificationCardError.CardExpired.ButtonText')}
          accessibilityLabel={t('BCSC.VerificationCardError.CardExpired.ButtonText')}
          buttonType={ButtonType.Primary}
          onPress={() => Linking.openURL(GET_BCSC_URL)}
        />
      </ScreenWrapper>
    )
  }

  return (
    <ScreenWrapper>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.sm }}>
        {t('BCSC.MismatchedSerial.Heading')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.lg }}>{t('BCSC.MismatchedSerial.Description1')}</ThemedText>
      <ThemedText variant={'bold'}>
        {t('BCSC.MismatchedSerial.SerialNumber', { serial: store.bcscSecure.serial })}
      </ThemedText>
      <ThemedText variant={'bold'} style={{ marginBottom: Spacing.lg }}>
        {t('BCSC.MismatchedSerial.Birthdate', {
          birthdate: store.bcscSecure.birthdate?.toLocaleString(t('BCSC.LocaleStringFormat'), {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
        })}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.lg }}>{t('BCSC.MismatchedSerial.Description2')}</ThemedText>
      <Image style={styles.image} source={{ uri: CARD_NOT_FOUND_IMAGE }} resizeMode={'contain'} />
    </ScreenWrapper>
  )
}
export default VerificationCardErrorScreen
