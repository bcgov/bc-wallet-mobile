import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import SelfieImage from '@assets/img/selfie_example.png'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, View } from 'react-native'

const SELFIE_IMAGE = Image.resolveAssetSource(SelfieImage).uri

type PhotoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PhotoInstructions>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.PhotoInstructions>
}

const PhotoInstructionsScreen = ({ navigation, route }: PhotoInstructionsScreenProps) => {
  const { forLiveCall } = route.params
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      padding: Spacing.md,
    },
    image: {
      width: '100%',
      height: 200,
      marginBottom: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
      padding: Spacing.md,
    },
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      title={t('BCSC.PhotoInstructions.TakePhoto')}
      onPress={() => {
        navigation.navigate(BCSCScreens.TakePhoto, {
          deviceSide: 'front',
          cameraInstructions: '',
          cameraLabel: '',
          forLiveCall,
        })
      }}
      testID={'TakePhotoButton'}
      accessibilityLabel={t('BCSC.PhotoInstructions.TakePhoto')}
    />
  )

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.pageContainer}
      edges={['bottom', 'left', 'right']}
      scrollViewProps={{ contentContainerStyle: styles.contentContainer }}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
    >
      <Image source={{ uri: SELFIE_IMAGE }} style={styles.image} />
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.PhotoInstructions.Heading')}
      </ThemedText>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.PhotoInstructions.Bullet1')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.PhotoInstructions.Bullet2')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.PhotoInstructions.Bullet3')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.PhotoInstructions.Bullet4')}</ThemedText>
      </View>
    </ScreenWrapper>
  )
}

export default PhotoInstructionsScreen
