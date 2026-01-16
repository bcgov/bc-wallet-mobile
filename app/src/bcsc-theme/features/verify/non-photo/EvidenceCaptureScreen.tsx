import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { CameraFormat } from '@/bcsc-theme/components/utils/camera-format'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { getPhotoMetadata, PhotoMetadata } from '@/bcsc-theme/utils/file-info'
import { MaskType, TOKENS, useServices, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useCameraPermission, useCodeScanner } from 'react-native-vision-camera'

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
  const { updateEvidenceMetadata } = useSecureActions()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [captureState, setCaptureState] = useState<CaptureState>(CaptureState.CAPTURING)
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string>()
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoMetadata[]>([])
  const { hasPermission, requestPermission } = useCameraPermission()
  const { width } = useWindowDimensions()
  const { ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const scanner = useCardScanner()
  const codeScanner = useCodeScanner({
    codeTypes: scanner.codeTypes,
    onCodeScanned: async (codes) => {
      if (!codes.length) {
        return
      }

      await scanner.scanCard(codes, async (bcscSerial, license) => {
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

        if (license) {
          scanner.completeScan()
          scanner.handleScanDriversLicense(license)
          return
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

  const handleAcceptPhoto = async () => {
    if (!currentPhotoPath || !currentSide) {
      return
    }

    const photoMetadata = await getPhotoMetadata(currentPhotoPath, logger)
    photoMetadata.label = currentSide.image_side_name
    const newPhotos = [...capturedPhotos, photoMetadata]
    setCapturedPhotos(newPhotos)

    if (isLastSide) {
      await updateEvidenceMetadata(route.params.cardType, newPhotos)
      // All photos captured, navigate to form screen
      navigation.navigate(BCSCScreens.EvidenceIDCollection, { cardType })
    } else {
      // Move to next side
      setCurrentIndex((prev) => prev + 1)
      setCaptureState(CaptureState.CAPTURING)
      setCurrentPhotoPath(undefined)
    }
  }

  const handleRetakePhoto = () => {
    setCaptureState(CaptureState.CAPTURING)
    setCurrentPhotoPath(undefined)
  }

  const hasRequestedPermission = useRef(false)

  useEffect(() => {
    const checkPermissions = async () => {
      if (!hasPermission && !hasRequestedPermission.current) {
        hasRequestedPermission.current = true
        await requestPermission()
      }
    }

    checkPermissions()
  }, [hasPermission, requestPermission])

  if (!currentSide) {
    // needs to throw an error instead...
    return <></>
  }

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  return (
    <>
      {captureState === CaptureState.CAPTURING ? (
        <View style={styles.container}>
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
