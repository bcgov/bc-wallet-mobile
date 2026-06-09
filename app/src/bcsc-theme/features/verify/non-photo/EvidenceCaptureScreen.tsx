import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { CameraFormat } from '@/bcsc-theme/components/utils/camera'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { buildBarcodePayload } from '@/bcsc-theme/utils/barcode'
import { DriversLicenseMetadata } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { getPhotoMetadata } from '@/bcsc-theme/utils/file-info'
import { useAlerts } from '@/hooks/useAlerts'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { BCState } from '@/store'
import { withAlert } from '@/utils/alert'
import { MaskType, testIdWithKey, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useRef, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { BCSCCardProcess, EvidenceType, PhotoMetadata } from 'react-native-bcsc-core'
import { useCameraPermission, useCodeScanner } from 'react-native-vision-camera'

/**
 * Builds the barcodes array for the evidence upload payload, matching the
 * v3 structure (see BarcodeData.toServerJSON in ias-ios)
 *
 * Each scanned barcode type produces one entry:
 * - Code-39 or Code-128 (BCSC serial): `{ type, value }`
 * - PDF-417 (driver's licence): `{ type, content_type, document_number, family_name, ... address }`
 */

type EvidenceCaptureScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceCapture>
  route: { params: { cardType: EvidenceType } }
}

enum CaptureState {
  CAPTURING = 'CAPTURING',
  REVIEWING = 'REVIEWING',
}

const EvidenceCaptureScreen = ({ navigation, route }: EvidenceCaptureScreenProps) => {
  const { cardType } = route.params
  const [store] = useStore<BCState>()
  const isNonBCSCFlow = store.bcscSecure.cardProcess === BCSCCardProcess.NonBCSC
  const { clearAdditionalEvidence, updateEvidenceMetadata } = useSecureActions()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [captureState, setCaptureState] = useState<CaptureState>(CaptureState.CAPTURING)
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string>()
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoMetadata[]>([])
  const { hasPermission, requestPermission } = useCameraPermission()
  const { width } = useWindowDimensions()
  const { ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const scanner = useCardScanner()
  const bcscSerialRef = useRef<string | null>(null)
  const licenseRef = useRef<DriversLicenseMetadata | null>(null)
  const { isLoading: isCameraLoading } = useAutoRequestPermission(hasPermission, requestPermission)
  const { failedToReadFromLocalStorageAlert } = useAlerts(navigation)
  const codeScanner = useCodeScanner({
    codeTypes: scanner.codeTypes,
    onCodeScanned: async (codes) => {
      if (!codes.length) {
        return
      }

      // If we have already captured both values, no need to keep scanning
      if (bcscSerialRef.current && licenseRef.current) {
        return
      }

      await scanner.scanCard(codes, async (bcscSerial, license) => {
        if (bcscSerial) {
          bcscSerialRef.current = bcscSerial
        }

        if (license) {
          licenseRef.current = license
        }
      })
    },
  })

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
    },
    reticleContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      backgroundColor: 'transparent',
      alignItems: 'center',
      pointerEvents: 'none', // Allow touch events to pass through
    },
    reticle: {
      width: width - 80, // Match mask width
      height: (width - 80) / 1.59, // Match mask height/ratio
      borderWidth: 6,
      borderColor: ColorPalette.brand.primary,
      borderRadius: 16,
    },
  })

  const currentSide = cardType.image_sides[currentIndex]
  const isLastSide = currentIndex === cardType.image_sides.length - 1

  const handlePhotoTaken = (path: string) => {
    setCurrentPhotoPath(path)
    setCaptureState(CaptureState.REVIEWING)
  }

  /**
   * Handles accepting the captured photo and proceeding to the next step.
   *
   * @returns A promise that resolves when the process is complete.
   */
  const handleAcceptPhoto = async () => {
    if (!currentPhotoPath || !currentSide) {
      return
    }

    /**
     * Non-BCSC flow only: the user may have scanned a real BC Services Card.
     * Let the backend decide via POST /device/barcodes rather than guessing
     * client-side. Only a card presenting BOTH a serial (1D) and an AAMVA (2D)
     * barcode can match, so that's the only case we ask about. A real BCSC
     * reroutes into setup; anything else — a lone serial (e.g. a PR card's 1D
     * barcode), a passport, a DL — falls through to evidence capture with no
     * error (matching v3 behaviour).
     *
     * In the Non-Photo BCSC flow we've already done authorizeDevice, so we skip.
     */
    if (isNonBCSCFlow) {
      if (bcscSerialRef.current && licenseRef.current) {
        const switchedToBcsc = await scanner.handleScanBarcodes(bcscSerialRef.current, licenseRef.current)
        if (switchedToBcsc) {
          await clearAdditionalEvidence()
          return
        }
      }
    }

    /**
     * Driver's License
     * Additional evidence: Required
     * Next Step: Navigate to evidence ID collection (after all photos captured)
     */
    if (licenseRef.current) {
      scanner.handleScanDriversLicense(licenseRef.current)
    }

    // Wrap getPhotoMetadata with alert
    const getPhotoMetadataWithAlert = withAlert(getPhotoMetadata, failedToReadFromLocalStorageAlert)
    const photoMetadata = await getPhotoMetadataWithAlert(currentPhotoPath, logger)
    photoMetadata.label = currentSide.image_side_name
    const newPhotos = [...capturedPhotos, photoMetadata]
    setCapturedPhotos(newPhotos)

    if (isLastSide) {
      // Build barcode payload to include in the single dispatch alongside photo metadata.
      // This avoids stale-closure issues from calling two store updates back-to-back.
      const barcodes = buildBarcodePayload(bcscSerialRef.current, licenseRef.current)
      await updateEvidenceMetadata(cardType, newPhotos, barcodes.length > 0 ? barcodes : undefined)

      // All photos captured, navigate to form screen
      navigation.navigate(BCSCScreens.EvidenceIDCollection, {
        cardType,
        documentNumber: licenseRef.current?.licenseNumber,
      })
      return
    }

    // Move to next side
    setCurrentIndex((prev) => prev + 1)
    setCaptureState(CaptureState.CAPTURING)
    setCurrentPhotoPath(undefined)
  }

  const handleRetakePhoto = () => {
    setCaptureState(CaptureState.CAPTURING)
    setCurrentPhotoPath(undefined)
  }

  if (!currentSide) {
    // needs to throw an error instead...
    return <></>
  }

  if (isCameraLoading) {
    return <LoadingScreen />
  }

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  return (
    <>
      {captureState === CaptureState.CAPTURING ? (
        <View style={styles.container} testID={testIdWithKey('EvidenceCaptureScreenMaskedCamera')}>
          <MaskedCamera
            navigation={navigation}
            cameraFace={'back'}
            cameraInstructions={currentSide.image_side_tip}
            cameraLabel={currentSide.image_side_label}
            maskType={MaskType.ID_CARD}
            maskLineColor={ColorPalette.brand.primary}
            onPhotoTaken={handlePhotoTaken}
            codeScanner={codeScanner}
            cameraFormatFilter={CameraFormat.MaskedWithBarcodeDetection}
          />
        </View>
      ) : (
        <PhotoReview photoPath={currentPhotoPath!} onAccept={handleAcceptPhoto} onRetake={handleRetakePhoto} />
      )}
    </>
  )
}

export default EvidenceCaptureScreen
