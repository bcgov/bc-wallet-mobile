import { ListButton } from '@/bcsc-theme/components/ListButton'
import { ICON_SIZE } from '@/constants'
import { a11yLabel } from '@/utils/accessibility'
import HighlightSerialBarcodeImage from '@assets/img/highlight_serial_barcode.png'
import { ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

const SCAN_CARD_EXAMPLE_IMAGE = Image.resolveAssetSource(HighlightSerialBarcodeImage).uri
const CardScanningError = () => {
  //   const { t } = useTranslation()
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

  return (
    <ScreenWrapper scrollViewContainerStyle={styles.pageHeaderContainer}>
      <ThemedText variant="headingThree">Problem scanning the card</ThemedText>
      <ThemedText style={styles.description}>The serial number captured does not match our records.</ThemedText>
      <ThemedText style={{ fontWeight: 'bold' }}>Serial Number: 123456789</ThemedText>
      <ThemedText style={styles.description}>
        {`Make sure you're scanning a BC Services Card. Check if you have a BC Services Card`}
      </ThemedText>

      <Image source={{ uri: SCAN_CARD_EXAMPLE_IMAGE }} style={styles.image} resizeMode={'contain'} />

      <ThemedText style={styles.description}>
        {`Check the serial number matches what is on your card. If the serial number doesn't match:`}
      </ThemedText>
      <ListButton
        position="only"
        onPress={() => {
          console.log('Enter manually')
        }}
        accessibilityLabel={a11yLabel('Enter serial number manually')}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{`Enter serial number manually`}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
      <ListButton
        position="only"
        onPress={() => {
          console.log('Scan again')
        }}
        accessibilityLabel={a11yLabel('Scan again')}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{`Scan again`}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
      <ThemedText style={{ ...styles.description, marginTop: Spacing.lg }}>
        If problems scanning the card continues:
      </ThemedText>
      <ListButton
        position="only"
        onPress={() => {
          console.log('Try another card')
        }}
        accessibilityLabel={a11yLabel('Try another card')}
      >
        <View style={styles.listButtonContainer}>
          <ThemedText style={styles.listButtonTitle}>{`Try another card`}</ThemedText>
          <Icon name={'arrow-forward-ios'} size={ICON_SIZE} color={ColorPalette.brand.headerText} />
        </View>
      </ListButton>
    </ScreenWrapper>
  )
}

export default CardScanningError
