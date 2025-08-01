import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, useAnimatedComponents, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import RNFS from 'react-native-fs'
import { SafeAreaView } from 'react-native-safe-area-context'
import TakeMediaButton from './components/TakeMediaButton'
import { CommonActions } from '@react-navigation/native'
import { Buffer } from 'buffer'

type InformationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.InformationRequired>
}

const InformationRequiredScreen = ({ navigation }: InformationRequiredScreenProps) => {
  const { Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [loading, setLoading] = useState(false)
  const uploadedBoth = useMemo(
    () => store.bcsc.photoPath && store.bcsc.videoPath && store.bcsc.videoThumbnailPath,
    [store.bcsc.photoPath, store.bcsc.videoPath, store.bcsc.videoThumbnailPath]
  )
  const { ButtonLoading } = useAnimatedComponents()
  const { evidence } = useApi()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
    },
    // no properties needed, just a helpful label for the View
    mediaContainer: {},

    controlsContainer: {
      padding: Spacing.md,
    },
  })

  const onPressSend = async () => {
    try {
      setLoading(true)
      // Fetch photo and convert into bytes
      const jpegBytes = await RNFS.readFile(store.bcsc.photoPath!, 'base64')
      const photoBytes = new Uint8Array(Buffer.from(jpegBytes, 'base64'))

      // Fetch video and convert into bytes
      const videoBase64 = await RNFS.readFile(store.bcsc.videoPath!, 'base64')
      const videoBytes = new Uint8Array(Buffer.from(videoBase64, 'base64'))

      // Send photo and video metadata to API
      const [photoMetadataResponse, videoMetadataResponse] = await Promise.all([
        evidence.uploadPhotoEvidenceMetadata(store.bcsc.photoMetadata!),
        evidence.uploadVideoEvidenceMetadata(store.bcsc.videoMetadata!),
      ])

      // Upload photo and video bytes to the respective URIs
      await Promise.all([
        evidence.uploadPhotoEvidenceBinary(photoMetadataResponse.upload_uri, photoBytes),
        evidence.uploadVideoEvidenceBinary(videoMetadataResponse.upload_uri, videoBytes),
      ])

      // Send final verification request
      await evidence.sendVerificationRequest(store.bcsc.verificationRequestId!, {
        upload_uris: [photoMetadataResponse.upload_uri, videoMetadataResponse.upload_uri],
        sha256: store.bcsc.verificationRequestSha!,
      })

      dispatch({ type: BCDispatchAction.UPDATE_PENDING_VERIFICATION, payload: [true] })
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SuccessfullySent }],
        })
      )
    } catch (error) {
      // TODO: Handle error, e.g., show an alert or log the error
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.mediaContainer}>
        <TakeMediaButton
          onPress={() => {
            navigation.navigate(BCSCScreens.PhotoInstructions)
          }}
          title={'Photo of your face'}
          actionLabel={'Take Photo'}
          thumbnailUri={`file://${store.bcsc.photoPath}`}
          style={{ borderBottomWidth: 0 }}
        />
        <TakeMediaButton
          onPress={() => {
            navigation.navigate(BCSCScreens.VideoInstructions)
          }}
          title={'Video of your face'}
          actionLabel={'Record Video'}
          thumbnailUri={
            store.bcsc.videoPath && store.bcsc.videoThumbnailPath && `file://${store.bcsc.videoThumbnailPath}`
          }
        />
      </View>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          title={'Send to Service BC Now'}
          onPress={onPressSend}
          testID={'SendToServiceBCNow'}
          accessibilityLabel={'Send to Service BC Now'}
          disabled={!uploadedBoth || loading}
        >
          {loading && <ButtonLoading />}
        </Button>
      </View>
    </SafeAreaView>
  )
}

export default InformationRequiredScreen
