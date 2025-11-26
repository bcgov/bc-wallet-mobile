import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'

import { StackNavigationProp } from '@react-navigation/stack'

import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { MaskType } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'

type PhotoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.TakePhoto>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.TakePhoto>
}

const TakePhotoScreen = ({ navigation, route }: PhotoInstructionsScreenProps) => {
  const { t } = useTranslation()

  const handlePhotoTaken = async (path: string) => {
    // Navigate to photo review screen with the photo data
    navigation.navigate(BCSCScreens.PhotoReview, {
      photoPath: path,
      forLiveCall: route.params.forLiveCall,
    })
  }

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={['top', 'bottom', 'left', 'right']}>
      <MaskedCamera
        navigation={navigation}
        cameraFace="front"
        cameraLabel={t('BCSC.SendVideo.TakePhoto.CameraInstructions')}
        maskType={MaskType.OVAL}
        onPhotoTaken={handlePhotoTaken}
      />
    </ScreenWrapper>
  )
}

export default TakePhotoScreen
