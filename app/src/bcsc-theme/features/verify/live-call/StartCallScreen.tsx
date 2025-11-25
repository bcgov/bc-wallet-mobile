import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import { BCState } from '@/store'
import { Button, ButtonType, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet } from 'react-native'

type StartCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.StartCall>
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
    },
    contentContainer: {
      padding: Spacing.md,
    },
    // At smaller sizes the Image tag will ignore exif tags, which provide orientation
    // (along with other metadata.) Image is rendered at a larger size to pick up the
    // exif data, then scaled down and given negative margin to fit in the button
    image: {
      height: 300, // height that will ensure EXIF
      alignSelf: 'center',
      aspectRatio: 1 / 1.3,
      overflow: 'hidden',
      transform: [{ scale: 0.333 }], // scale to match thumbnailHeight
      margin: -100, // -height * scale
    },
    controlsContainer: {
      marginTop: 'auto',
      padding: Spacing.md,
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

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      title={t('BCSC.VideoCall.StartCall')}
      accessibilityLabel={t('BCSC.VideoCall.StartVideoCall')}
      onPress={onPressStart}
    />
  )

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.pageContainer}
      scrollViewContainerStyle={styles.contentContainer}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
    >
      <Image source={{ uri: `file://${store.bcsc.photoPath}` }} resizeMode={'contain'} style={styles.image} />
      <ThemedText variant={'headingThree'} style={{ marginTop: Spacing.xxl }}>
        {t('BCSC.VideoCall.StartVideoCallDescription')}
      </ThemedText>
      <ThemedText style={{ marginTop: Spacing.lg }}>{t('BCSC.VideoCall.YouShould')}</ThemedText>
      <BulletPointWithText translationKey={'BCSC.VideoTips.PrivatePlace'} />
      <BulletPointWithText translationKey={'BCSC.VideoTips.OnlyPerson'} />
      <BulletPointWithText translationKey={'BCSC.VideoTips.RemoveGlasses'} />
    </ScreenWrapper>
  )
}

export default StartCallScreen
