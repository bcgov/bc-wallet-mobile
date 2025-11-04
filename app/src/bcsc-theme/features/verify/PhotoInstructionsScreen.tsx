import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import SelfieImage from '@assets/img/selfie_example.png'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const SELFIE_IMAGE = Image.resolveAssetSource(SelfieImage).uri

type PhotoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PhotoInstructions>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.PhotoInstructions>
}

const PhotoInstructionsScreen = ({ navigation, route }: PhotoInstructionsScreenProps) => {
  const { forLiveCall } = route.params
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    image: {
      width: '100%',
      height: 200,
      marginBottom: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.pageContainer}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Image source={{ uri: SELFIE_IMAGE }} style={styles.image} />
        <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
          Take a photo of your face. The agent will use this photo when verifying your identity.
        </ThemedText>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Hold your phone in front of you</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Remove your glasses for the photo only</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Be the only person in the photo</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Look like the photo on your BC Services Card or photo ID</ThemedText>
        </View>
      </ScrollView>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          title={'Take Photo of Face'}
          onPress={() => {
            navigation.navigate(BCSCScreens.TakePhoto, {
              deviceSide: 'front',
              cameraInstructions: '',
              cameraLabel: '',
              forLiveCall,
            })
          }}
          testID={'TakePhotoButton'}
          accessibilityLabel={'Take Photo of Face'}
        />
      </View>
    </SafeAreaView>
  )
}

export default PhotoInstructionsScreen
