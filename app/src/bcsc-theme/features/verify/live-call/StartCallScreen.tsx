import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import { BCState } from '@/store'
import { Button, ButtonType, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type StartCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.StartCall>
}

const StartCallScreen = ({ navigation }: StartCallScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
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
      // At smaller sizes the Image tag will ignore exif tags, which provide orientation (along with other metadata)
      // Image is rendered at a larger size to pick up the exif data, then scaled down to fit in the button
      height: 240,
      alignSelf: 'center',
      aspectRatio: 1 / 1.3,
      overflow: 'hidden',
      transform: [{ scale: 0.5 }],
      margin: -60,
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
          {t('Unified.VideoCall.StartVideoCallDescription')}
        </ThemedText>
        <ThemedText style={{ marginTop: Spacing.lg }}>{t('Unified.VideoCall.YouShould')}</ThemedText>
        <BulletPointWithText translationKey={'Unified.VideoTips.PrivatePlace'} />
        <BulletPointWithText translationKey={'Unified.VideoTips.OnlyPerson'} />
        <BulletPointWithText translationKey={'Unified.VideoTips.RemoveGlasses'} />
      </ScrollView>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          title={t('Unified.VideoCall.StartCall')}
          accessibilityLabel={t('Unified.VideoCall.StartVideoCall')}
          onPress={onPressStart}
        />
      </View>
    </SafeAreaView>
  )
}

export default StartCallScreen
