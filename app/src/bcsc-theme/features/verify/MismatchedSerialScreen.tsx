import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCState } from '@/store'
import CardNotFoundImage from '@assets/img/card_not_found_highlight.png'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, useWindowDimensions } from 'react-native'

const CARD_NOT_FOUND_IMAGE = Image.resolveAssetSource(CardNotFoundImage).uri

const twoThirds = 0.67

const MismatchedSerialScreen = () => {
  const { ColorPalette, Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { width } = useWindowDimensions()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollView: {
      padding: Spacing.md,
    },
    image: {
      width: width - Spacing.md * 2,
      height: (width - Spacing.md * 2) * twoThirds,
      marginBottom: Spacing.lg,
    },
  })

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.pageContainer}
      edges={['bottom', 'left', 'right']}
      scrollViewProps={{ contentContainerStyle: styles.scrollView }}
    >
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.sm }}>
        {t('BCSC.MismatchedSerial.Heading')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.lg }}>{t('BCSC.MismatchedSerial.Description1')}</ThemedText>
      <ThemedText variant={'bold'}>{t('BCSC.MismatchedSerial.SerialNumber', { serial: store.bcsc.serial })}</ThemedText>
      <ThemedText variant={'bold'} style={{ marginBottom: Spacing.lg }}>
        {t('BCSC.MismatchedSerial.Birthdate', {
          birthdate: store.bcsc.birthdate?.toLocaleString(t('BCSC.LocaleStringFormat'), {
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
export default MismatchedSerialScreen
