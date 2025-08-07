import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCallback, useState } from 'react'
import { EvidenceType, VerificationPhotoUploadPayload } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import RectangularMask from '@/bcsc-theme/components/RectangularMask'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { useStore, useTheme } from '@bifold/core'
import { BCState, BCDispatchAction } from '@/store'
import { getPhotoMetadata, PhotoMetadata } from '@/bcsc-theme/utils/file-info'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

type EvidenceCaptureScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EvidenceCapture>
  route: { params: { cardType: EvidenceType } }
}

const EvidenceCaptureScreen = ({ navigation, route }: EvidenceCaptureScreenProps) => {
  const { cardType } = route.params
  const [, dispatch] = useStore<BCState>()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [captureState, setCaptureState] = useState<'CAPTURING' | 'REVIEWING'>('CAPTURING')
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string>()
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoMetadata[]>([])
  const { width } = useWindowDimensions()
  const { ColorPalette } = useTheme()

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
      setCaptureState('CAPTURING')
      setCurrentPhotoPath(undefined)
      setCapturedPhotos([])
    }, [])
  )

  const handlePhotoTaken = (path: string) => {
    setCurrentPhotoPath(path)
    setCaptureState('REVIEWING')
  }

  const handleAcceptPhoto = async () => {
    // TODO: (al) an issue with accepting a photo, then navigating back, will add a new photo to the list
    // I think if it is being navigated back from the EvidenceCollectionScreen that it needs to reset the state and take both pictures again
    if (!currentPhotoPath || !currentSide) return

    const photoMetadata = await getPhotoMetadata(currentPhotoPath)
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
      setCaptureState('CAPTURING')
      setCurrentPhotoPath(undefined)
    }
  }

  const handleRetakePhoto = () => {
    setCaptureState('CAPTURING')
    setCurrentPhotoPath(undefined)
  }

  if (!currentSide) {
    // needs to throw an error instead...
    return <></>
  }

  return (
    <>
      {captureState === 'CAPTURING' ? (
        <View style={styles.container}>
          <MaskedCamera
            navigation={navigation}
            cameraFace={'back'}
            cameraInstructions={currentSide.image_side_tip}
            cameraLabel={currentSide.image_side_label}
            cameraMask={<RectangularMask />}
            onPhotoTaken={handlePhotoTaken}
          />
          <View style={styles.reticleContainer}>
            <View style={styles.reticle} />
          </View>
        </View>
      ) : (
        <PhotoReview photoPath={currentPhotoPath!} onAccept={handleAcceptPhoto} onRetake={handleRetakePhoto} />
      )}
    </>
  )
}

export default EvidenceCaptureScreen
