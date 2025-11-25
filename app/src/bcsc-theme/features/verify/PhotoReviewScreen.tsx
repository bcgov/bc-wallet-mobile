import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { getPhotoMetadata } from '@bcsc-theme/utils/file-info'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { CommonActions, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

type PhotoReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PhotoReview>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.PhotoReview>
}

const PhotoReviewScreen = ({ navigation, route }: PhotoReviewScreenProps) => {
  const [, dispatch] = useStore<BCState>()
  const { photoPath, forLiveCall } = route.params
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()

  if (!photoPath) {
    throw new Error(t('BCSC.PhotoReview.PathRequired'))
  }

  const onPressUse = async () => {
    try {
      const photoMetadata = await getPhotoMetadata(photoPath)

      dispatch({ type: BCDispatchAction.SAVE_PHOTO, payload: [{ photoPath, photoMetadata }] })

      if (forLiveCall) {
        navigation.dispatch(
          CommonActions.reset({
            index: 3,
            routes: [
              { name: BCSCScreens.SetupSteps },
              { name: BCSCScreens.VerificationMethodSelection },
              { name: BCSCScreens.PhotoInstructions, params: { forLiveCall: true } },
              { name: BCSCScreens.StartCall },
            ],
          })
        )
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
    }
  }

  const onPressRetake = () => {
    navigation.goBack()
  }

  return (
    <ScreenWrapper scrollable={false} edges={['top', 'left', 'right']}>
      <PhotoReview photoPath={photoPath} onAccept={onPressUse} onRetake={onPressRetake} />
    </ScreenWrapper>
  )
}

export default PhotoReviewScreen
