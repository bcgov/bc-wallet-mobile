import HighlightSerialBarcodeImage from '@assets/img/highlight_serial_barcode.png'
import { ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { PressableOpacity } from '@components/PressableOpacity'
import React from 'react'
import { Image, StyleSheet, useWindowDimensions } from 'react-native'

const SCAN_CARD_EXAMPLE_IMAGE = Image.resolveAssetSource(HighlightSerialBarcodeImage).uri
const CardScanningError = () => {
  //   const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    container: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    content: {
      paddingTop: 24,
    },
    title: {
      color: '#242424',
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 36,
      marginBottom: 16,
    },
    description: {
      color: '#4B4B4B',
      fontSize: 16,
      lineHeight: 24,
    },
    actions: {
      gap: 12,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: '#003366',
      borderRadius: 4,
      minHeight: 52,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: '#003366',
      borderRadius: 4,
      borderWidth: 1,
      minHeight: 52,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: '#003366',
      fontSize: 16,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.75,
    },
    pageHeaderContainer: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    image: {
      width: width - Spacing.md * 6,
      height: (width - Spacing.md * 6) * 0.67,
      padding: Spacing.lg,
      alignSelf: 'center',
      marginBottom: Spacing.lg,
    },
  })

  return (
    <ScreenWrapper scrollViewContainerStyle={styles.pageHeaderContainer}>
      <ThemedText variant="headingThree">Problem scanning the card</ThemedText>
      <ThemedText style={{}}>The serial number captured does not match our records.</ThemedText>
      <ThemedText style={{ fontWeight: 'bold' }}>Serial Number: 123456789</ThemedText>
      <ThemedText style={styles.description}>
        {`Make sure you're scanning a BC Services Card. Check if you have a BC Services Card`}
      </ThemedText>

      <Image source={{ uri: SCAN_CARD_EXAMPLE_IMAGE }} style={styles.image} resizeMode={'contain'} />

      <ThemedText style={styles.description}>
        {`Check the serial number matches what is on your card. If the serial number doesn't match:`}
      </ThemedText>
      <PressableOpacity
        onPress={() => {
          console.log('Enter manually')
        }}
      >
        <ThemedText>{`Enter serial number manually`}</ThemedText>
      </PressableOpacity>
      <PressableOpacity
        onPress={() => {
          console.log('Scan again')
        }}
      >
        <ThemedText>{`Scan again`}</ThemedText>
      </PressableOpacity>
      <ThemedText style={styles.description}>We couldn’t scan your card</ThemedText>
      <PressableOpacity
        onPress={() => {
          console.log('Try another card')
        }}
      >
        <ThemedText>{`Try another card`}</ThemedText>
      </PressableOpacity>
    </ScreenWrapper>
  )
}

export default CardScanningError
