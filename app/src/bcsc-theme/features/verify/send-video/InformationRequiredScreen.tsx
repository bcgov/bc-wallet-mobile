import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, useAnimatedComponents, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import RNFS from 'react-native-fs'
import ImageResizer from 'react-native-image-resizer'
import { SafeAreaView } from 'react-native-safe-area-context'
import TakeMediaButton from './components/TakeMediaButton'
import { hashBase64 } from 'react-native-bcsc-core'

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

      // Get original image dimensions
      const getImageDimensions = (): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
          Image.getSize(
            store.bcsc.photoPath!,
            (width, height) => resolve({ width, height }),
            (error) => reject(error)
          )
        })
      }

      const { width, height } = await getImageDimensions()
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
      const response = await evidence.uploadPhotoEvidence(
        {
          content_length: pngBytes.length,
          content_type: 'image/png',
          date: 1752096719,
          label: 'front',
          filename: 'selfie.jpg',
          sha256: photoSHA,
        },
        store.bcsc.deviceCode!
      )

      console.log(response)
      // const [{ uri: photoUri }, { uri: videoUri }] = await Promise.all([
      //   evidence.uploadPhotoEvidence(pngBytes, store.bcsc.deviceCode!),
      //   evidence.uploadVideoEvidence(videoBytes)
      // ])
      // const {} = await evidence.sendVerificationRequest({ uploadUris: [photoUri, videoUri], sha256: store.bcsc.verificationRequest!.sha256 })
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
