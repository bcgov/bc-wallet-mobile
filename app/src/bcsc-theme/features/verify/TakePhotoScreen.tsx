import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'

import { StackNavigationProp } from '@react-navigation/stack'

import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import CircularMask from '@/bcsc-theme/components/CircularMask'
import { RouteProp } from '@react-navigation/native'

type PhotoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.TakePhoto>
  route: RouteProp<BCSCVerifyIdentityStackParams, BCSCScreens.TakePhoto>
}

const TakePhotoScreen = ({ navigation, route }: PhotoInstructionsScreenProps) => {
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      position: 'relative',
    },
  })

  const handlePhotoTaken = async (path: string) => {
    // Navigate to photo review screen with the photo data
    navigation.navigate(BCSCScreens.PhotoReview, {
      photoPath: path,
      forLiveCall: route.params.forLiveCall,
    })
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      <MaskedCamera
        navigation={navigation}
        cameraFace="front"
        cameraLabel="Position your face within the oval and press the button on the screen"
        cameraMask={<CircularMask />}
        onPhotoTaken={handlePhotoTaken}
      />
    </SafeAreaView>
  )
}

export default TakePhotoScreen
