import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, Mask, Rect } from 'react-native-svg'
import { useCameraPermission } from 'react-native-vision-camera'
import CodeScanningCamera from '../../components/CodeScanningCamera'
import TorchButton from '../../components/TorchButton'
import { BCSC_SN_SCAN_ZONES, ScanState } from '../../components/utils/camera'

/**
 * How long the initial "Scan your card" guidance shows before falling back to
 * the steady-hold help text + manual-entry button.
 */
const SCAN_HELP_TIMEOUT_MS = 10000

type ScanSerialScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.ManualSerial>
}

type IdCardMaskOverlayProps = {
  width: number
  height: number
  strokeColor: string
  overlayColor?: string
  overlayOpacity?: number
}

/**
 * Full-bleed dark overlay with a vertically-oriented ID-card cutout. Mirrors the
 * look of bifold's `MaskType.ID_CARD` (rounded-rect window + stroke) but stands
 * the card up in portrait orientation and is sized to the camera area rather than
 * the whole window — so the cutout lines up under the navigation header.
 */
const IdCardMaskOverlay: React.FC<IdCardMaskOverlayProps> = ({
  width,
  height,
  strokeColor,
  overlayColor = 'black',
  overlayOpacity = 0.6,
}) => {
  // Reserve space for the instruction banner (top) and the torch + manual-entry
  // button (bottom) so the enlarged card sits cleanly between them.
  const TOP_RESERVE = 0.18
  const BOTTOM_RESERVE = 0.24
  const availTop = height * TOP_RESERVE
  const availHeight = height * (1 - TOP_RESERVE - BOTTOM_RESERVE)
  // CR-80 ID card ratio (~1.585). bifold uses 1.6 for the landscape card; we
  // invert it (height = width × 1.6) so the card stands vertically. Fill the
  // available area, capped to 82% of the width.
  const cardWidth = Math.min(width * 0.82, availHeight / 1.6)
  const cardHeight = cardWidth * 1.6
  const x = (width - cardWidth) / 2
  const y = availTop + (availHeight - cardHeight) / 2
  const radius = 16

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Mask id="idCardMask">
            <Rect width={width} height={height} fill="white" />
            <Rect x={x} y={y} width={cardWidth} height={cardHeight} rx={radius} ry={radius} fill="black" />
          </Mask>
        </Defs>
        <Rect width={width} height={height} fill={overlayColor} fillOpacity={overlayOpacity} mask="url(#idCardMask)" />
        <Rect
          x={x}
          y={y}
          width={cardWidth}
          height={cardHeight}
          rx={radius}
          ry={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={3}
        />
      </Svg>
    </View>
  )
}

/**
 * Screen for scanning BC Services Card barcodes.
 * Camera fills the entire screen to fit a standard ID card (CR-80, ~85.6×53.98mm).
 * DL's are ignored, Combo, Photo, and Non-Photo cards are accepted
 */
const ScanSerialScreen: React.FC<ScanSerialScreenProps> = ({ navigation }: ScanSerialScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const { hasPermission, requestPermission } = useCameraPermission()
  const scanner = useCardScanner()

  const { isLoading } = useAutoRequestPermission(hasPermission, requestPermission)

  const [torchOn, setTorchOn] = useState(false)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [scanState, setScanState] = useState<ScanState>('scanning')
  // Starts on mount; after the timeout we swap the initial guidance for the
  // steady-hold help text and reveal the manual-entry button.
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowHelp(true), SCAN_HELP_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  const onContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setSize({ width, height })
  }

  const toggleTorch = () => setTorchOn((prev) => !prev)

  const onCodeScanned = async (barcodes: ScanableCode[]): Promise<boolean | void> => {
    let accepted = true
    await scanner.scanCard(barcodes, async (bcscSerial, license) => {
      if (bcscSerial && license) {
        scanner.completeScan()
        await scanner.handleScanComboCard(bcscSerial, license)
        return
      }

      if (bcscSerial) {
        scanner.completeScan()
        await scanner.handleScanBCServicesCard(bcscSerial)
        return
      }

      accepted = false
      scanner.completeScan()
      await scanner.handleScanNonBcsc()
    })
    return accepted
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    topBanner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      backgroundColor: ColorPalette.notification.popupOverlay,
      alignItems: 'center',
    },
    instructionText: {
      color: ColorPalette.grayscale.white,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
    },
    instructionSubText: {
      color: ColorPalette.grayscale.white,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '400',
      marginTop: Spacing.sm,
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      gap: Spacing.sm,
    },
    torchRow: {
      alignItems: 'flex-end',
      paddingBottom: Spacing.sm,
      paddingRight: Spacing.lg,
    },
    buttonBlock: {
      padding: Spacing.lg,
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
  })

  // Recolour the framing outline as the card aligns: highlight → green.
  const frameStrokeColor =
    scanState === 'scanning' ? ColorPalette.brand.highlight : scanState === 'aligned' ? '#00CC00' : '#00FF00'

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={[]}>
      <View style={styles.container} onLayout={onContainerLayout}>
        {/* Camera fills the entire screen */}
        <CodeScanningCamera
          onCodeScanned={onCodeScanned}
          cameraType={'back'}
          initialZoom={2}
          scanZones={BCSC_SN_SCAN_ZONES}
          showScanZoneOverlay={false}
          showZoomIndicator={false}
          hideTorchButton
          torchActive={torchOn}
          onToggleTorch={toggleTorch}
          onScanStateChange={setScanState}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Vertical ID-card framing guide (appearance of MaskType.ID_CARD) */}
        {size ? <IdCardMaskOverlay width={size.width} height={size.height} strokeColor={frameStrokeColor} /> : null}

        {/* Instruction text — initial guidance until the timeout, then steady-hold help */}
        <View style={styles.topBanner} pointerEvents="none">
          {showHelp ? (
            <Text style={styles.instructionText}>{t('BCSC.Scan.HoldSteadyHelp')}</Text>
          ) : (
            <>
              <Text style={styles.instructionText}>{t('BCSC.Scan.ScanYourCard')}</Text>
              <Text style={styles.instructionSubText}>{t('BCSC.Scan.LineUpHelp')}</Text>
            </>
          )}
        </View>

        {/* Torch + manual entry */}
        <View style={styles.bottomBar} pointerEvents="box-none">
          <View style={styles.torchRow} pointerEvents="box-none">
            <TorchButton active={torchOn} onPress={toggleTorch} />
          </View>
          {/* Always reserves its space so the torch above doesn't shift; only
              becomes visible/interactive once the timeout elapses. */}
          <View
            style={[styles.buttonBlock, { paddingBottom: insets.bottom + Spacing.lg, opacity: showHelp ? 1 : 0 }]}
            pointerEvents={showHelp ? 'auto' : 'none'}
            accessibilityElementsHidden={!showHelp}
            importantForAccessibility={showHelp ? 'auto' : 'no-hide-descendants'}
          >
            <Button
              title={t('BCSC.Instructions.EnterManually')}
              accessibilityLabel={t('BCSC.Instructions.EnterManually')}
              testID={testIdWithKey('EnterManually')}
              onPress={() => navigation.navigate(BCSCScreens.ManualSerial)}
              buttonType={ButtonType.Primary}
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  )
}

export default ScanSerialScreen
