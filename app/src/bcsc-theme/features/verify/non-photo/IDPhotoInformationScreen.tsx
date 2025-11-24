import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import SCAN_ID_IMAGE from '@assets/img/credential-scan.png'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, View } from 'react-native'

type IDPhotoInformationScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.IDPhotoInformation>
  route: { params: { cardType: EvidenceType } }
}

const IDPhotoInformationScreen = ({ navigation, route }: IDPhotoInformationScreenProps) => {
  const { cardType } = route.params
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollView: {
      padding: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
      padding: Spacing.md,
    },
    image: {
      width: '100%',
      height: 250,
      marginBottom: Spacing.md,
    },
  })

  const controls = (
    <Button
      title={t('BCSC.IDPhotoInformation.TakePhoto')}
      accessibilityLabel={t('BCSC.IDPhotoInformation.TakePhoto')}
      testID={testIdWithKey('IDPhotoInformationTakePhoto')}
      onPress={() => {
        navigation.navigate(BCSCScreens.EvidenceCapture, {
          cardType: cardType,
        })
      }}
      buttonType={ButtonType.Primary}
    />
  )

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.pageContainer}
      edges={['left', 'right', 'bottom']}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
      scrollViewProps={{ contentContainerStyle: styles.scrollView, showsVerticalScrollIndicator: false }}
    >
      <Image source={SCAN_ID_IMAGE} style={styles.image} />
      <View style={{ marginBottom: Spacing.md }}>
        <ThemedText style={{ marginBottom: Spacing.md }} variant={'headingThree'}>
          {t('BCSC.IDPhotoInformation.Heading')}
        </ThemedText>
        <BulletPointWithText
          translationKey={t('BCSC.IDPhotoInformation.IDPhotoInstructionsBullet1')}
          iconColor={ColorPalette.grayscale.white}
        />
        <BulletPointWithText
          translationKey={t('BCSC.IDPhotoInformation.IDPhotoInstructionsBullet2')}
          iconColor={ColorPalette.grayscale.white}
        />
        <BulletPointWithText
          translationKey={t('BCSC.IDPhotoInformation.IDPhotoInstructionsBullet3')}
          iconColor={ColorPalette.grayscale.white}
        />
        <BulletPointWithText
          translationKey={t('BCSC.IDPhotoInformation.IDPhotoInstructionsBullet4')}
          iconColor={ColorPalette.grayscale.white}
        />
      </View>
    </ScreenWrapper>
  )
}

export default IDPhotoInformationScreen
