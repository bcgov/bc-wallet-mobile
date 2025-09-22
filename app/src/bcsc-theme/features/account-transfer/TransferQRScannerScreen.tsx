import { MaskType, ScanCamera, SVGOverlay, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'

const TransferQRScannerScreen: React.FC = () => {
  const { ColorPalette, themeName, Spacing } = useTheme()
  const handleScan = async (value: string) => {
    console.log('SCANNED A QR CODE!!!!')
    console.log(value)
  }
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
  return (
    <View style={styles.container}>
      <View>
        <ThemedText variant="headerTitle" style={{ paddingBottom: Spacing.lg }}>
          A valid QR code will scan automatically
        </ThemedText>
      </View>
      <ScanCamera handleCodeScan={handleScan} />

      <SVGOverlay maskType={MaskType.QR_CODE} strokeColor={ColorPalette.grayscale.white} />
      {/* <ScanCamera handleCodeScan={handleScan} /> */}
    </View>
  )
}

export default TransferQRScannerScreen
