import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { getPhotoMetadata } from '@bcsc-theme/utils/file-info'
import { TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type PhotoReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.PhotoReview>
  route: RouteProp<BCSCVerifyIdentityStackParams, BCSCScreens.PhotoReview>
}

const PhotoReviewScreen = ({ navigation, route }: PhotoReviewScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { photoPath, forLiveCall } = route.params
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  if (!photoPath) {
    throw new Error('Photo path is required')
  }

  const styles = StyleSheet.create({
    pageContainer: {
      position: 'relative',
      flexGrow: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      flexGrow: 1,
    },
    controlsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: Spacing.md,
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
    secondButton: {
      marginTop: Spacing.sm,
    },
  })

  const onPressUse = async () => {
    try {
      const photoMetadata = await getPhotoMetadata(photoPath)

      dispatch({ type: BCDispatchAction.SAVE_PHOTO, payload: [{ photoPath, photoMetadata }] })

      console.log('forLiveCall: ', forLiveCall)
      if (forLiveCall) {
        navigation.dispatch(CommonActions.reset({
          index: 3,
          routes: [
            { name: BCSCScreens.SetupSteps },
            { name: BCSCScreens.VerificationMethodSelection },
            { name: BCSCScreens.PhotoInstructions, params: { forLiveCall: true } },
            { name: BCSCScreens.StartCall }
          ]
        }))
        return
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 2,
          routes: [
            { name: BCSCScreens.SetupSteps },
            { name: BCSCScreens.VerificationMethodSelection },
            { name: BCSCScreens.InformationRequired },
          ],
        })
      )
    } catch (error) {
      logger.error(`Error saving photo: ${error}`)
      // TODO: Handle error, e.g., show an alert or log the error
    }
  }

  const onPressRetake = () => {
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      <PhotoReview photoPath={photoPath} onAccept={onPressUse} onRetake={onPressRetake} />
    </SafeAreaView>
  )
}

export default PhotoReviewScreen
