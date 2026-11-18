import { ListButton } from '@/bcsc-theme/components/ListButton'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl, ICON_SIZE } from '@/constants'
import { a11yLabel } from '@/utils/accessibility'
import HighlightSerialBarcodeImage from '@assets/img/highlight_serial_barcode.png'
import { Link, ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

const SCAN_CARD_EXAMPLE_IMAGE = Image.resolveAssetSource(HighlightSerialBarcodeImage).uri

type CardScanningErrorScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.CardScanningError>
}

const CardScanningErrorScreen = ({ navigation }: CardScanningErrorScreenProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    description: {},
    pageHeaderContainer: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
    image: {
      width: width - Spacing.md * 6,
      height: (width - Spacing.md * 6) * 0.67,
      padding: Spacing.lg,
      alignSelf: 'center',
      marginBottom: Spacing.lg,
    },
    listButtonContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    listButtonTitle: {
      flex: 1,
      color: ColorPalette.brand.headerText,
      fontWeight: 'bold',
    },
  })

  const learnAboutServicesCard = () => {
    navigation.navigate(BCSCScreens.VerifyWebView, {
      title: t('BCSC.Screens.HelpCentre'),
      url: HelpCentreUrl.HELP_CHECK_BCSC,
    })
  }

  return (
    <ScreenWrapper scrollViewContainerStyle={styles.pageHeaderContainer}>
      <ThemedText variant="headingThree">{t('BCSC.CardScanningError.Heading')}</ThemedText>
      <ThemedText style={styles.description}>{t('BCSC.CardScanningError.Description1')}</ThemedText>
      <ThemedText style={{ fontWeight: 'bold' }}>
        {t('BCSC.CardScanningError.SerialNumber', { serial: '123456789' })}
      </ThemedText>
      <ThemedText style={styles.description}>
        {t('BCSC.CardScanningError.Description2')}
        <Link linkText={t('BCSC.CardScanningError.CheckCardLink')} onPress={learnAboutServicesCard} />
      </ThemedText>

      <Image source={{ uri: SCAN_CARD_EXAMPLE_IMAGE }} style={styles.image} resizeMode={'contain'} />

      <ThemedText style={styles.description}>{t('BCSC.CardScanningError.Description3')}</ThemedText>
      <ListButton
        position="only"
        onPress={() => {
          console.log('Enter manually')
        }}
        accessibilityLabel={a11yLabel(t('BCSC.CardScanningError.EnterManually'))}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{t('BCSC.CardScanningError.EnterManually')}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
      <ListButton
        position="only"
        onPress={() => {
          console.log('Scan again')
        }}
        accessibilityLabel={a11yLabel(t('BCSC.CardScanningError.ScanAgain'))}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{t('BCSC.CardScanningError.ScanAgain')}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
      <ThemedText style={{ marginTop: Spacing.lg }}>{t('BCSC.CardScanningError.Description4')}</ThemedText>
      <ListButton
        position="only"
        onPress={() => {
          console.log('Try another card')
        }}
        accessibilityLabel={a11yLabel(t('BCSC.CardScanningError.TryAnotherCard'))}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{t('BCSC.CardScanningError.TryAnotherCard')}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
    </ScreenWrapper>
  )
}

export default CardScanningErrorScreen
