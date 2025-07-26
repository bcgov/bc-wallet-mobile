import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import RectangularMask from '@/bcsc-theme/components/RectangularMask'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'

type EvidenceCaptureScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EvidenceCapture>
  route: { params: { cardType: EvidenceType } }
}

const EvidenceCaptureScreen: React.FC<EvidenceCaptureScreenProps> = ({
  navigation,
  route,
}: EvidenceCaptureScreenProps) => {
  const { cardType } = route.params

  const [currentIndex, setCurrentIndex] = useState(0)
  const [captureState, setCaptureState] = useState<'CAPTURING' | 'REVIEWING'>('CAPTURING')
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string>()
  const [capturedPhotos, setCapturedPhotos] = useState<any[]>([])

  const currentSide = cardType.image_sides[currentIndex]
  const isLastSide = currentIndex === cardType.image_sides.length - 1

  const handlePhotoTaken = (path: string) => {
    setCurrentPhotoPath(path)
    setCaptureState('REVIEWING')
  }

  const handleAcceptPhoto = async () => {
    if (!currentPhotoPath || !currentSide) return

    const newPhotos = [...capturedPhotos, { path: currentPhotoPath, side: currentSide }]
    setCapturedPhotos(newPhotos)

    if (isLastSide) {
      // All photos captured, navigate back with results
      navigation.navigate(BCSCScreens.SetupSteps)
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
    <SafeAreaView style={{ flex: 1 }}>
      {captureState === 'CAPTURING' ? (
        <MaskedCamera
          navigation={navigation}
          cameraFace={'back'}
          cameraInstructions={currentSide.image_side_tip}
          cameraLabel={currentSide.image_side_label}
          cameraMask={<RectangularMask />}
          onPhotoTaken={handlePhotoTaken}
        />
      ) : (
        <PhotoReview photoPath={currentPhotoPath!} onAccept={handleAcceptPhoto} onRetake={handleRetakePhoto} />
      )}
    </SafeAreaView>
  )
}

export default EvidenceCaptureScreen
