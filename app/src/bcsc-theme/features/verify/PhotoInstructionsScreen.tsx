import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointList from '@/components/BulletPointList'
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
      height: 200,
    },
    bulletContainer: {
      flexDirection: 'row',
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const controls = (
    <ControlContainer>
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
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
      edges={['bottom', 'left', 'right']}
      padded={false}
    >
      <WhiteHandHoldingPhone style={styles.image} height={styles.image.height} width={styles.image.width} />
      <ThemedText variant={'headingFour'}>{t('BCSC.PhotoInstructions.Heading')}</ThemedText>
     <BulletPointList
        translationKeys={[
          t('BCSC.PhotoInstructions.Bullet1'),
          t('BCSC.PhotoInstructions.Bullet2'),
          t('BCSC.PhotoInstructions.Bullet3'),
          t('BCSC.PhotoInstructions.Bullet4'),
        ]}
      />
    </ScreenWrapper>
  )
}

export default PhotoInstructionsScreen
