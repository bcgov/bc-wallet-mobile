import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { MaskType, testIdWithKey } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useCameraPermission } from 'react-native-vision-camera'

type EvidenceCaptureScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceCapture>
}

enum CaptureState {
  CAPTURING = 'CAPTURING',
  REVIEWING = 'REVIEWING',
}

const TOP_BANNER_HEIGHT = 140

const EvidenceCaptureScreen = ({ navigation }: EvidenceCaptureScreenProps) => {
  const { t } = useTranslation()
  const { width, height } = useWindowDimensions()
  const { hasPermission, requestPermission } = useCameraPermission()
  const { isLoading: isCameraLoading } = useAutoRequestPermission(hasPermission, requestPermission)
  const [captureState, setCaptureState] = useState<CaptureState>(CaptureState.CAPTURING)
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string>()

  // SVGOverlay's customPath is the cutout — this rectangle leaves the top
  // banner area inside the dark overlay so the instruction text reads clearly.
  const customPath = `M 0 ${TOP_BANNER_HEIGHT} H ${width} V ${height} H 0 Z`

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
    },
  })

  const handlePhotoTaken = (path: string) => {
    setCurrentPhotoPath(path)
    setCaptureState(CaptureState.REVIEWING)
  }

  const handleAcceptPhoto = async () => {
    if (!currentPhotoPath) {
      return
    }

    navigation.navigate(BCSCScreens.EvidenceIDCollection, {
      photoPath: currentPhotoPath,
    })
  }

  const handleRetakePhoto = () => {
    setCaptureState(CaptureState.CAPTURING)
    setCurrentPhotoPath(undefined)
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
            cameraInstructions={t('BCSC.EvidenceCapture.Instructions')}
            cameraLabel={t('BCSC.EvidenceCapture.Label')}
            maskType={MaskType.CUSTOM}
            customPath={customPath}
            onPhotoTaken={handlePhotoTaken}
          />
        </View>
      ) : (
        <PhotoReview photoPath={currentPhotoPath!} onAccept={handleAcceptPhoto} onRetake={handleRetakePhoto} />
      )}
    </>
  )
}

export default EvidenceCaptureScreen
