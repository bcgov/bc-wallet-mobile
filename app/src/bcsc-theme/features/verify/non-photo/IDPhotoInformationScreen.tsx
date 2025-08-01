import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import SCAN_ID_IMAGE from '@assets/img/credential-scan.png'
import BulletPointWithText from '@/components/BulletPointWithText'

type IDPhotoInformationScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.IDPhotoInformation>
  route: { params: { cardType: EvidenceType } }
}

const IDPhotoInformationScreen = ({ navigation, route }: IDPhotoInformationScreenProps) => {
  const { cardType } = route.params
  const { ColorPalette, Spacing } = useTheme()
  const { width, height } = useWindowDimensions()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      margin: Spacing.lg,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.lg,
    },
    controlsContainer: {
      margin: Spacing.md,
      marginTop: 'auto',
      position: 'relative',
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: Spacing.md,
      height: height / 2, // Set container to 1/3 of screen height
      justifyContent: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
  })
  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.imageContainer}>
        <Image source={SCAN_ID_IMAGE} style={styles.image} />
      </View>
      <View>
        <ThemedText style={{ marginBottom: Spacing.md }} variant={'headingThree'}>
          {'Take a photo of your ID. An agent will look at this photo when verifying your identity.'}
        </ThemedText>
        <BulletPointWithText text={'Center your ID within the frame'} />
        <BulletPointWithText text={'Have no other objects in the photo'} />
        <BulletPointWithText text={'Make sure the entire ID is visible'} />
        <BulletPointWithText text={'Make sure the image is clear without any glare or shadows'} />
      </View>
      <View style={{ marginTop: Spacing.md }}>
        <Button
          title={'Take photo of ID'}
          accessibilityLabel={'Take photo of ID'}
          testID={''}
          onPress={() => {
            navigation.navigate(BCSCScreens.EvidenceCapture, {
              cardType: cardType,
            })
          }}
          buttonType={ButtonType.Primary}
        />
      </View>
    </SafeAreaView>
  )
}

export default IDPhotoInformationScreen
