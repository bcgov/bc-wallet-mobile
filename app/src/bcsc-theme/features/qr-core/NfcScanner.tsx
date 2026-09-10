import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCQRCoreTabParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { DismissiblePopupModal, testIdWithKey, useTheme } from '@bifold/core'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import useScanScreenViewModel from './useScanScreenViewModel'

type ScanState = 'checking' | 'unsupported' | 'ready' | 'scanning'

/**
 * NFC counterpart to QRScanner. Reads the URI record off a tapped NDEF tag and
 * hands the decoded string to the same `useScanScreenViewModel().handleScan`
 * used by the camera scanner — the DIDComm OOB / pairing-code strategies, and
 * everything downstream of them, are identical regardless of how the string
 * was captured.
 */
const NfcScanner: React.FC = () => {
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<BottomTabNavigationProp<BCSCQRCoreTabParams>>()
  const [state, setState] = useState<ScanState>('checking')
  const mountedRef = useRef(true)

  const onConnectionFound = useCallback(
    (oobRecordId: string) => {
      // NfcScanner sits inside QRCoreStack (a tab navigator); ConnectionLoading
      // lives on MainStack, so escape up via getParent before navigating.
      navigation
        .getParent<StackNavigationProp<BCSCMainStackParams>>()
        ?.navigate(BCSCScreens.ConnectionLoading, { oobRecordId })
    },
    [navigation]
  )

  const onPairingCodeFound = useCallback(
    (pairingCode: string) => {
      navigation.navigate(BCSCQRCoreScreens.PairingCode, { pairingCode })
    },
    [navigation]
  )

  const { isProcessing, scanError, handleScan, dismissError, resetNavigationLock } = useScanScreenViewModel({
    onConnectionFound,
    onPairingCodeFound,
  })

  // Mirrors QRScanner's focus-effect reset: QRCoreStack has `unmountOnBlur:
  // false`, so this screen persists across the ConnectionLoading round trip.
  useFocusEffect(
    useCallback(() => {
      resetNavigationLock()
    }, [resetNavigationLock])
  )

  useEffect(() => {
    mountedRef.current = true

    const scanLoop = async () => {
      while (mountedRef.current) {
        try {
          setState('scanning')
          await NfcManager.requestTechnology(NfcTech.Ndef)
          const tag = await NfcManager.getTag()
          const record = tag?.ndefMessage?.[0]
          if (record && mountedRef.current) {
            const uri = Ndef.uri.decodePayload(new Uint8Array(record.payload))
            if (uri) {
              await handleScan(uri)
            }
          }
        } catch {
          // Most rejections here are benign (user moved the tag away, or the
          // OS-level tech request timed out) — just loop and try again.
        } finally {
          await NfcManager.cancelTechnologyRequest().catch(() => {})
        }
        if (mountedRef.current) {
          setState('ready')
        }
      }
    }

    ;(async () => {
      const supported = await NfcManager.isSupported()
      if (!mountedRef.current) {
        return
      }
      if (!supported) {
        setState('unsupported')
        return
      }
      await NfcManager.start()
      scanLoop()
    })()

    return () => {
      mountedRef.current = false
      NfcManager.cancelTechnologyRequest().catch(() => {})
    }
  }, [handleScan])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
      backgroundColor: ColorPalette.grayscale.black,
    },
    icon: {
      marginBottom: Spacing.lg,
    },
    statusText: {
      ...TextTheme.normal,
      color: ColorPalette.grayscale.white,
      textAlign: 'center',
    },
    processingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  return (
    <View style={styles.container} testID={testIdWithKey(TestIds.main.qrCore.nfcScannerTab)}>
      {state === 'unsupported' ? (
        <Text style={styles.statusText}>{t('BCSC.Scan.NfcNotSupported')}</Text>
      ) : (
        <>
          <Icon name="nfc" size={64} color={ColorPalette.grayscale.white} style={styles.icon} />
          <Text style={styles.statusText}>{t('BCSC.Scan.NfcReady')}</Text>
        </>
      )}
      {isProcessing && (
        <View style={styles.processingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={ColorPalette.grayscale.white} />
        </View>
      )}
      {scanError && (
        <DismissiblePopupModal
          title={t('BCSC.Scan.ErrorDetails')}
          description={scanError.message}
          onCallToActionLabel={t('BCSC.Scan.Dismiss')}
          onCallToActionPressed={dismissError}
          onDismissPressed={dismissError}
        />
      )}
    </View>
  )
}

export default NfcScanner
