import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { MaskType, ScreenWrapper } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useCameraPermission } from 'react-native-vision-camera'

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
      />
    </ScreenWrapper>
  )
}

export default TakePhotoScreen
