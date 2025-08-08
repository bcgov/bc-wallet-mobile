import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EvidenceType } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import SCAN_ID_IMAGE from '@assets/img/credential-scan.png'
import BulletPointWithText from '@/components/BulletPointWithText'
import { ScrollView } from 'react-native-gesture-handler'
import { useTranslation } from 'react-i18next'

type IDPhotoInformationScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.IDPhotoInformation>
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
      margin: Spacing.lg,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.lg,
    },
    controlsContainer: {
      margin: Spacing.md,
      marginTop: 'auto',
      position: 'relative',
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: Spacing.md,
      height: 200,
      justifyContent: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
  })
  return (
    <SafeAreaView style={styles.pageContainer} edges={['left', 'right']}>
      <ScrollView>
        <View style={styles.imageContainer}>
          <Image source={SCAN_ID_IMAGE} style={styles.image} />
        </View>
        <View>
          <ThemedText style={{ marginBottom: Spacing.md }} variant={'headingThree'}>
            {t('Unified.IDPhotoInformation.Heading')}
          </ThemedText>
          <BulletPointWithText translationKey={t('Unified.IDPhotoInformation.IDPhotoInstructionsBullet1')} />
          <BulletPointWithText translationKey={t('Unified.IDPhotoInformation.IDPhotoInstructionsBullet2')} />
          <BulletPointWithText translationKey={t('Unified.IDPhotoInformation.IDPhotoInstructionsBullet3')} />
          <BulletPointWithText translationKey={t('Unified.IDPhotoInformation.IDPhotoInstructionsBullet4')} />
        </View>
        <View style={{ marginTop: Spacing.md }}>
          <Button
            title={t('Unified.IDPhotoInformation.TakePhoto')}
            accessibilityLabel={t('Unified.IDPhotoInformation.TakePhoto')}
            testID={testIdWithKey('IDPhotoInformationTakePhoto')}
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
