import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { CameraFormat } from '@/bcsc-theme/components/utils/camera'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { DriversLicenseMetadata } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { getPhotoMetadata } from '@/bcsc-theme/utils/file-info'
import { useAlerts } from '@/hooks/useAlerts'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { withAlert } from '@/utils/alert'
import { MaskType, testIdWithKey, TOKENS, useServices, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useRef, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { EvidenceType, PhotoMetadata } from 'react-native-bcsc-core'
import { useCameraPermission, useCodeScanner } from 'react-native-vision-camera'
import { LoadingScreenContent } from '../../splash-loading/LoadingScreenContent'

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
     * Combo card
     * Additional evidence: Not needed
     * Next Step: Navigate to setup steps verification
     */
    if (bcscSerialRef.current && licenseRef.current) {
      await Promise.all([
        clearAdditionalEvidence(),
        scanner.handleScanComboCard(bcscSerialRef.current, licenseRef.current),
      ])
      return
    }

    /**
     * BC Services card
     * Additional evidence: Not needed
     * Next Step: Navigate to birthdate entry -> setup steps verification
     */
    if (bcscSerialRef.current) {
      await Promise.all([clearAdditionalEvidence(), scanner.handleScanBCServicesCard(bcscSerialRef.current)])
      return
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
      await updateEvidenceMetadata(route.params.cardType, newPhotos)
      // All photos captured, navigate to form screen
      navigation.navigate(BCSCScreens.EvidenceIDCollection, { cardType })
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
    return <LoadingScreenContent loading={isCameraLoading} onLoaded={() => {}} />
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
