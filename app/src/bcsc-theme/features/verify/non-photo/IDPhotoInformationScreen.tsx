import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import { useEffect } from 'react'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'

type IDPhotoInformationScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.IDPhotoInformation>
  route: { params: { cardType: EvidenceType } }
}

const IDPhotoInformationScreen: React.FC<IDPhotoInformationScreenProps> = ({
  navigation,
  route,
}: IDPhotoInformationScreenProps) => {
  console.log('____________')
  console.log(route.params.cardType)
  const { cardType } = route.params
  const { ColorPallet, Spacing } = useTheme()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
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
        <View>{/* <Image source={{ uri: '' }} /> */}</View>
        <View>
          <ThemedText variant={'headingThree'}>
            {'Take a photo of your ID. An agent will look at this photo when verifying your identity.'}
          </ThemedText>
          <ThemedText>{'Center your ID within the frame'}</ThemedText>
          <ThemedText>{'Have no other objects in the photo'}</ThemedText>
          <ThemedText>{'Make sure the entire ID is visible'}</ThemedText>
          <ThemedText>{'Make sure the image is clear without any glare or shadows'}</ThemedText>
        </View>
        <View style={{ marginTop: Spacing.md }}>
          <Button
            title={'Take Photo'}
            accessibilityLabel={'Take Photo'}
            testID={''}
            onPress={() => {
              navigation.navigate(BCSCScreens.TakePhoto, {
                deviceSide: 'back',
                cameraLabel: cardType.image_sides[0].image_side_label,
                cameraInstructions: cardType.image_sides[0].image_side_tip,
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
