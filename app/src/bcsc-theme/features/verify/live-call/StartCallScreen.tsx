import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import { BCState } from '@/store'
import { Button, ButtonType, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type StartCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.StartCall>
}

const thumbnailHeight = 120

const StartCallScreen = ({ navigation }: StartCallScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [store] = useStore<BCState>()

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
      height: thumbnailHeight,
      aspectRatio: 1,
      alignSelf: 'center',
    },
    controlsContainer: {
      marginTop: 'auto',
    },
    bulletContainer: {
      flexDirection: 'row',
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const onPressStart = () => {
    navigation.navigate(BCSCScreens.LiveCall)
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.pageContainer}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Image source={{ uri: `file://${store.bcsc.photoPath}` }} resizeMode={'contain'} style={styles.image} />
        <ThemedText variant={'headingThree'} style={{ marginTop: Spacing.xxl }}>
          Start a video call with a Service BC agent. They will verify your identity to finish setting up this app.
        </ThemedText>
        <ThemedText style={{ marginTop: Spacing.lg }}>You should:</ThemedText>
        <BulletPointWithText translationKey={'Unified.VideoTips.PrivatePlace'} />
        <BulletPointWithText translationKey={'Unified.VideoTips.OnlyPerson'} />
        <BulletPointWithText translationKey={'Unified.VideoTips.RemoveGlasses'} />
      </ScrollView>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          title={'Start call'}
          accessibilityLabel={'Start video call'}
          onPress={onPressStart}
        />
      </View>
    </SafeAreaView>
  )
}

export default StartCallScreen
