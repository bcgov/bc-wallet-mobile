import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image, StyleSheet, View } from 'react-native'
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
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.md,
    },
    controlsContainer: {
      margin: Spacing.md,
      marginTop: 'auto',
      position: 'relative',
    },
  })
  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View>
          <Image source={SCAN_ID_IMAGE} />
        </View>
        <View>
          <ThemedText variant={'headingThree'}>
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
      </ScrollView>
    </SafeAreaView>
  )
}

export default IDPhotoInformationScreen
