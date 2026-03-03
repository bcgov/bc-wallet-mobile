import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { CameraFormat } from '@/bcsc-theme/components/utils/camera'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { MaskType, ScreenWrapper } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { useCameraPermission } from 'react-native-vision-camera'
import { LoadingScreenContent } from '../splash-loading/LoadingScreenContent'

type PhotoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.TakePhoto>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.TakePhoto>
}

const TakePhotoScreen = ({ navigation, route }: PhotoInstructionsScreenProps) => {
  const { t } = useTranslation()
  const { hasPermission, requestPermission } = useCameraPermission()

  const handlePhotoTaken = async (path: string) => {
    // Navigate to photo review screen with the photo data
    navigation.navigate(BCSCScreens.PhotoReview, {
      photoPath: path,
      forLiveCall: route.params.forLiveCall,
    })
  }

  const { isLoading } = useAutoRequestPermission(hasPermission, requestPermission)

  if (isLoading) {
    return <LoadingScreenContent loading={isLoading} onLoaded={() => {}} />
  }

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" headerPadding={true} />
  }

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={['top']}>
      <MaskedCamera
        navigation={navigation}
        cameraFace="front"
        cameraInstructions={t('BCSC.SendVideo.TakePhoto.CameraInstructions')}
        maskType={MaskType.OVAL}
        onPhotoTaken={handlePhotoTaken}
        cameraFormatFilter={CameraFormat.MaskedWithBarcodeDetection}
      />
    </ScreenWrapper>
  )
}

export default TakePhotoScreen
