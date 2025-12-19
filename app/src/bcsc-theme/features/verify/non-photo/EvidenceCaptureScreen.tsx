import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { getPhotoMetadata, PhotoMetadata } from '@/bcsc-theme/utils/file-info'
import { BC_SERVICES_CARD_BARCODE, DRIVERS_LICENSE_BARCODE, OLD_BC_SERVICES_CARD_BARCODE } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { MaskType, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useCodeScanner } from 'react-native-vision-camera'

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
  const [, dispatch] = useStore<BCState>()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [captureState, setCaptureState] = useState<CaptureState>(CaptureState.CAPTURING)
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string>()
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoMetadata[]>([])
  const { width } = useWindowDimensions()
  const { ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const scanner = useCardScanner()
  const codeScanner = useCodeScanner({
    codeTypes: [
      // Currently supported barcodes
      BC_SERVICES_CARD_BARCODE,
      OLD_BC_SERVICES_CARD_BARCODE,
      DRIVERS_LICENSE_BARCODE,
    ],
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

  useFocusEffect(
    useCallback(() => {
      // Reset state when navigating to this screen
      setCurrentIndex(0)
      setCaptureState(CaptureState.CAPTURING)
      setCurrentPhotoPath(undefined)
      setCapturedPhotos([])
    }, [])
  )

  const handlePhotoTaken = (path: string) => {
    setCurrentPhotoPath(path)
    setCaptureState(CaptureState.REVIEWING)
  }

  const handleAcceptPhoto = async () => {
    if (!currentPhotoPath || !currentSide) return

    const photoMetadata = await getPhotoMetadata(currentPhotoPath, logger)
    photoMetadata.label = currentSide.image_side_name
    const newPhotos = [...capturedPhotos, photoMetadata]
    setCapturedPhotos(newPhotos)

    if (isLastSide) {
      dispatch({
        type: BCDispatchAction.UPDATE_EVIDENCE_METADATA,
        payload: [{ evidenceType: route.params.cardType, metadata: newPhotos }],
      })
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

  if (!currentSide) {
    // needs to throw an error instead...
    return <></>
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
          />
        </View>
      ) : (
        <PhotoReview photoPath={currentPhotoPath!} onAccept={handleAcceptPhoto} onRetake={handleRetakePhoto} />
      )}
    </>
  )
}

export default EvidenceCaptureScreen
