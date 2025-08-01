import { BCDispatchAction, BCState } from '@/store'
import { VerificationPhotoUploadPayload } from '@bcsc-theme/api/hooks/useEvidenceApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { getFileInfo } from '@bcsc-theme/utils/file-info'
import {
  Button,
  ButtonType,
  testIdWithKey,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Buffer } from 'buffer'
import { useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { hashBase64 } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'
import { SafeAreaView } from 'react-native-safe-area-context'

type PhotoReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.PhotoReview>
  route: {
    params: {
      photoPath: string
    }
  }
}

const PhotoReviewScreen = ({ navigation, route }: PhotoReviewScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { photoPath } = route.params
  const [loading, setLoading] = useState(false)
  const { ButtonLoading } = useAnimatedComponents()
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
      setLoading(true)
      const fileInfo = await getFileInfo(photoPath)
      const jpegBytes = await RNFS.readFile(photoPath, 'base64')
      const data = new Uint8Array(Buffer.from(jpegBytes, 'base64'))
      const photoSHA = await hashBase64(jpegBytes)

      const photoMetadata: VerificationPhotoUploadPayload = {
        content_length: data.byteLength,
        content_type: 'image/jpeg',
        date: Math.floor(fileInfo.timestamp),
        label: 'front',
        filename: fileInfo.filename,
        sha256: photoSHA,
      }

      dispatch({ type: BCDispatchAction.SAVE_PHOTO, payload: [{ photoPath, photoMetadata }] })

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
    } finally {
      setLoading(false)
    }
  }

  const onPressRetake = () => {
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <Image source={{ uri: `file://${photoPath}` }} style={{ height: '100%', width: 'auto', resizeMode: 'cover' }} />
        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            onPress={onPressUse}
            testID={testIdWithKey('UsePhoto')}
            title={'Use this photo'}
            accessibilityLabel={'Use this photo'}
            disabled={loading}
          >
            {loading && <ButtonLoading />}
          </Button>
          <View style={styles.secondButton}>
            <Button
              buttonType={ButtonType.Tertiary}
              onPress={onPressRetake}
              testID={testIdWithKey('RetakePhoto')}
              title={'Retake photo'}
              accessibilityLabel={'Retake photo'}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default PhotoReviewScreen
