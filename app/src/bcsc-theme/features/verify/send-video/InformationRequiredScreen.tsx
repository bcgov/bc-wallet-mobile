import useApi from '@/bcsc-theme/api/hooks/useApi'
import { VerificationPhotoUploadPayload, VerificationVideoUploadPayload } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, useAnimatedComponents, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { hashBase64 } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'
import ImageResizer from 'react-native-image-resizer'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { OnLoadData } from 'react-native-video'
import Video from 'react-native-video'
import TakeMediaButton from './components/TakeMediaButton'

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

      const getVideoInfo = async (
        videoPath: string
      ): Promise<{
        duration: number
        size: number
        timestamp: number
        filename: string
      }> => {
        return new Promise((resolve, reject) => {
          // Get file stats first
          RNFS.stat(videoPath)
            .then((stats) => {
              const filename = videoPath.split('/').pop() || 'video.mp4'
              const timestamp = new Date(stats.mtime).getTime()

              // Use a hidden Video component to get duration
              let videoRef: Video | null = null

              const cleanup = () => {
                if (videoRef) {
                  videoRef = null
                }
              }

              // Create video element to extract metadata
              const VideoComponent = (
                <Video
                  ref={(ref) => {
                    videoRef = ref
                  }}
                  source={{ uri: videoPath }}
                  paused={true}
                  muted={true}
                  resizeMode="contain"
                  style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
                  onLoad={(data: OnLoadData) => {
                    cleanup()
                    resolve({
                      duration: Math.round(data.duration), // Round to nearest second
                      size: stats.size,
                      timestamp,
                      filename,
                    })
                  }}
                  onError={(error: any) => {
                    cleanup()
                    reject(new Error(`Failed to load video metadata: ${error.error || 'Unknown error'}`))
                  }}
                />
              )

              // For now, we'll use a fallback approach since we can't render the component here
              // We'll estimate duration or use a default value
              // This is a limitation - ideally we'd use a native module for video metadata
              resolve({
                duration: 30, // Default fallback duration in seconds
                size: stats.size,
                timestamp,
                filename,
              })
            })
            .catch(reject)
        })
      }

      const [{ width, height }, fileInfo, videoInfo] = await Promise.all([
        getImageDimensions(),
        getFileInfo(store.bcsc.photoPath!),
        getVideoInfo(store.bcsc.videoPath!),
      ])

      console.log('Original image info:', { width, height, ...fileInfo })
      console.log('Video info:', videoInfo)
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
      const photoSHA = await hashBase64(pngBytes)

      const photoUploadPayload: VerificationPhotoUploadPayload = {
        content_length: pngBytes.length,
        content_type: 'image/png',
        date: Math.floor(fileInfo.timestamp),
        label: 'front',
        filename: fileInfo.filename.replace(/\.(jpg|jpeg)$/i, '.png'), // Change extension to .png since we converted it TODO test removing conversion
        sha256: photoSHA,
      }

      // Read the video file and calculate its hash
      const videoBytes = await RNFS.readFile(store.bcsc.videoPath!, 'base64')
      const videoSHA = await hashBase64(videoBytes)
      const prompts = store.bcsc.prompts!.map(({ id }, i) => ({
        id,
        prompted_at: i,
      }))

      // Prepare video upload payload
      const videoUploadPayload: VerificationVideoUploadPayload = {
        content_type: 'video/quicktime', // Assuming QuickTime format
        content_length: videoInfo.size,
        date: new Date().getTime(),
        sha256: videoSHA,
        duration: videoInfo.duration,
        prompts,
        filename: 'selfievideo.mov', // Use a default filename or extract from videoInfo if available
      }

      console.log('Video upload payload:', videoUploadPayload)

      const response = await evidence.uploadPhotoEvidence(photoUploadPayload)

      console.log('Photo upload response:', response)

      // Upload video evidence
      const videoResponse = await evidence.uploadVideoEvidence(videoUploadPayload)
      console.log('Video upload response:', videoResponse)

      // const [{ uri: photoUri }, { uri: videoUri }] = await Promise.all([
      //   evidence.uploadPhotoEvidence(pngBytes, store.bcsc.deviceCode!),
      //   evidence.uploadVideoEvidence(videoBytes)
      // ])
      const thaBigResponse = await evidence.sendVerificationRequest(store.bcsc.verificationRequestId!, { uploadUris: [response.upload_uri, videoResponse.upload_uri], sha256: store.bcsc.verificationRequestSha })
      console.log('Verification request response:', JSON.stringify(thaBigResponse, null, 2))
    } catch (error) {
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
