import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { MaskType, ScanCamera, SVGOverlay, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useCameraPermission } from 'react-native-vision-camera'

const QRScanner: React.FC = () => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { hasPermission, requestPermission } = useCameraPermission()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [torchActive, setTorchActive] = useState(false)

  useEffect(() => {
    if (!hasPermission) {
      requestPermission()
    }
  }, [hasPermission, requestPermission])

  const handleScan = useCallback(
    async (code: string) => {
      logger.info(`QR code scanned: ${code}`)
    },
    [logger]
  )

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
    messageContainer: {
      marginHorizontal: 40,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      paddingTop: 30,
    },
    icon: {
      color: ColorPalette.grayscale.white,
      padding: Spacing.md,
    },
    text: {
      color: ColorPalette.grayscale.white,
    },
    torchButton: {
      position: 'absolute',
      bottom: Spacing.lg,
      right: Spacing.lg,
      backgroundColor: torchActive ? ColorPalette.grayscale.white : 'rgba(0,0,0,0.4)',
      borderRadius: 24,
      padding: Spacing.sm,
    },
    torchIcon: {
      color: torchActive ? ColorPalette.grayscale.black : ColorPalette.grayscale.white,
    },
  })

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  return (
    <View style={styles.container}>
      <ScanCamera handleCodeScan={handleScan} enableCameraOnError={true} torchActive={torchActive} />
      <View pointerEvents="none" style={styles.overlay}>
        <SVGOverlay maskType={MaskType.QR_CODE} strokeColor={ColorPalette.grayscale.white} />
      </View>
      <View style={styles.messageContainer}>
        <Icon name="qrcode-scan" size={40} style={styles.icon} />
        <ThemedText variant="title" style={styles.text}>
          {t('BCSC.Scan.WillScanAutomatically')}
        </ThemedText>
      </View>
      <TouchableOpacity
        style={styles.torchButton}
        onPress={() => setTorchActive((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t(torchActive ? 'BCSC.Scan.TorchOff' : 'BCSC.Scan.TorchOn')}
      >
        <Icon name={torchActive ? 'flashlight' : 'flashlight-off'} size={28} style={styles.torchIcon} />
      </TouchableOpacity>
    </View>
  )
}

export default QRScanner
