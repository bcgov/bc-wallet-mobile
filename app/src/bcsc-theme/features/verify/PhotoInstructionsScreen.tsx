import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import WhiteHandHoldingPhone from '@assets/img/white-hand-holding-phone.svg'
import { Button, ButtonType, ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

type PhotoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.PhotoInstructions>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.PhotoInstructions>
}

const PhotoInstructionsScreen = ({ navigation, route }: PhotoInstructionsScreenProps) => {
  const { forLiveCall } = route.params
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    image: {
      width: '100%',
      height: 250,
    },
    bulletContainer: {
      flexDirection: 'row',
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
      accessibilityLabel={a11yLabel(t('BCSC.PhotoInstructions.TakePhotoAccessibilityLabel'))}
    />
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={{ gap: Spacing.md }}>
      <WhiteHandHoldingPhone style={styles.image} height={styles.image.height} width={styles.image.width} />
      <ThemedText variant={'headingThree'}>{t('BCSC.PhotoInstructions.Heading')}</ThemedText>
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
