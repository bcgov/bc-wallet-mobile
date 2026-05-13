import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointList from '@/components/BulletPointList'
import SCAN_ID_IMAGE from '@assets/img/id-photo-info.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { EvidenceType } from 'react-native-bcsc-core'

type IDPhotoInformationScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.IDPhotoInformation>
  route: { params: { cardType: EvidenceType } }
}

const IDPhotoInformationScreen = ({ navigation, route }: IDPhotoInformationScreenProps) => {
  const { cardType } = route.params
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const controls = (
    <ControlContainer>
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
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.sm,
        padding: Spacing.lg,
      }}
    >
      <SCAN_ID_IMAGE />
      <ThemedText variant={'headingThree'}>{t('BCSC.IDPhotoInformation.Heading')}</ThemedText>
      <BulletPointList
        translationKeys={[
          'BCSC.IDPhotoInformation.IDPhotoInstructionsBullet1',
          'BCSC.IDPhotoInformation.IDPhotoInstructionsBullet2',
          'BCSC.IDPhotoInformation.IDPhotoInstructionsBullet3',
          'BCSC.IDPhotoInformation.IDPhotoInstructionsBullet4',
        ]}
        iconColor={ColorPalette.brand.icon}
        iconSize={Spacing.xs}
      />
    </ScreenWrapper>
  )
}

export default IDPhotoInformationScreen
