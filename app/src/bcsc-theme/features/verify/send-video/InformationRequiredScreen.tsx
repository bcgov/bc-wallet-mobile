import useApi from '@/bcsc-theme/api/hooks/useApi'
import { VerificationPhotoUploadPayload } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, useAnimatedComponents, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { hashBase64 } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'
import ImageResizer from 'react-native-image-resizer'
import { SafeAreaView } from 'react-native-safe-area-context'
import TakeMediaButton from './components/TakeMediaButton'
import { CommonActions } from '@react-navigation/native'
import base64 from 'base64-js'

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

      // Get original image dimensions, filename, and timestamp
      const getImageDimensions = (): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
          Image.getSize(
            store.bcsc.photoPath!,
            (width, height) => resolve({ width, height }),
            (error) => reject(error)
          )
        })
      }

      // TODO: MOVE METADATA EXTRACTION FOR BOTH PHOTO AND VIDEO TO THEIR RESPECTIVE REVIEW SCREENS
      const getFileInfo = async (filePath: string) => {
        const stats = await RNFS.stat(filePath)
        const filename = filePath.split('/').pop() || 'selfie.png'
        return {
          filename,
          timestamp: new Date(stats.mtime).getTime() / 1000, // Convert to Unix timestamp
          size: stats.size,
        }
      }

      const [{ width, height }, fileInfo] = await Promise.all([
        getImageDimensions(),
        getFileInfo(store.bcsc.photoPath!),
      ])

      const convertedPhoto = await ImageResizer.createResizedImage(
        store.bcsc.photoPath!,
        width, // use original width
        height, // use original height
        'PNG', // format
        100, // quality (100 = no compression for PNG)
        0, // rotation
        undefined, // output path (undefined = cache directory)
        false, // keep metadata
        { mode: 'contain', onlyScaleDown: false }
      )

      // Read the PNG file as base64 bytes
      const pngBytes = await RNFS.readFile(convertedPhoto.uri, 'base64')
      const data = base64.toByteArray(pngBytes)
      const photoSHA = await hashBase64(pngBytes)

      const photoUploadPayload: VerificationPhotoUploadPayload = {
        content_length: data.byteLength,
        content_type: 'image/png',
        date: Math.floor(fileInfo.timestamp),
        label: 'front',
        filename: fileInfo.filename.replace(/\.(jpg|jpeg)$/i, '.png'), // Change extension to .png since we converted it TODO test removing conversion
        sha256: photoSHA,
      }

      // Upload photo metadata
      const photoResponse = await evidence.uploadPhotoEvidenceMetadata(photoUploadPayload)

      // Upload photo binary
      const uploadResponse = await evidence.uploadPhotoEvidenceBinary(photoResponse.upload_uri, data)

      // Upload video evidence
      const videoResponse = await evidence.uploadVideoEvidenceMetadata(store.bcsc.videoMetadata!)

      // Fetch video file, convert to base64, and upload
      const videoBase64 = await RNFS.readFile(store.bcsc.videoPath!, 'base64')
      const videoBytes = base64.toByteArray(videoBase64)

      const response = await evidence.uploadVideoEvidenceBinary(videoResponse.upload_uri, videoBytes)

      await evidence.sendVerificationRequest(store.bcsc.verificationRequestId!, {
        upload_uris: [photoResponse.upload_uri, videoResponse.upload_uri],
        sha256: store.bcsc.verificationRequestSha!,
      })

      dispatch({ type: BCDispatchAction.UPDATE_PENDING_VERIFICATION, payload: [true] })
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
    } catch (error) {
      console.error(JSON.stringify(error, null, 2))
      console.error('Error sending verification request:', error)
      // Handle error, e.g., show an alert or log the error
      return
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
          thumbnailUri={store.bcsc.photoPath}
          style={{ borderBottomWidth: 0 }}
        />
        <TakeMediaButton
          onPress={() => {
            navigation.navigate(BCSCScreens.VideoInstructions)
          }}
          title={'Video of your face'}
          actionLabel={'Record Video'}
          thumbnailUri={store.bcsc.videoPath && store.bcsc.videoThumbnailPath}
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
