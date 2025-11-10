import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import SCAN_ID_IMAGE from '@assets/img/credential-scan.png'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

type IDPhotoInformationScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.IDPhotoInformation>
  route: { params: { cardType: EvidenceType } }
}

const IDPhotoInformationScreen = ({ navigation, route }: IDPhotoInformationScreenProps) => {
  const { cardType } = route.params
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    scrollView: {
      flex: 1,
    },
    controlsContainer: {
      margin: Spacing.md,
      marginTop: 'auto',
      position: 'relative',
    },
    image: {
      flexShrink: 1,
      width: width - Spacing.md * 2,
      resizeMode: 'contain',
    },
  })
  return (
    <SafeAreaView style={styles.pageContainer} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollView} showsVerticalScrollIndicator={false}>
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
      </ScrollView>
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
    </SafeAreaView>
  )
}

export default IDPhotoInformationScreen
