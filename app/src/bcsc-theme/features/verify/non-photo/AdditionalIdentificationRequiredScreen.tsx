import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointList from '@/components/BulletPointList'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

type AdditionalIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const AdditionalIdentificationRequiredScreen: React.FC<AdditionalIdentificationRequiredScreenProps> = ({
  navigation,
}: AdditionalIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const controls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey(t('Global.Continue'))}
        onPress={() => {
          navigation.navigate(BCSCScreens.IDPhotoInformation)
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
      <ThemedText variant={'headingThree'}>{t('BCSC.AdditionalEvidence.PhotoRequired')}</ThemedText>
      <ThemedText>{t('BCSC.AdditionalEvidence.PhotoRequiredDescription')}</ThemedText>
      <ThemedText variant={'headingFour'}>{t('BCSC.AdditionalEvidence.CheckYourID')}</ThemedText>
      <BulletPointList
        translationKeys={[
          'BCSC.AdditionalEvidence.CheckYourIDBullet1',
          'BCSC.AdditionalEvidence.CheckYourIDBullet2',
          'BCSC.AdditionalEvidence.CheckYourIDBullet3',
        ]}
        iconColor={ColorPalette.brand.icon}
        iconSize={Spacing.xs}
      />
      <ThemedText variant={'headingFour'}>{t('BCSC.AdditionalEvidence.LimitedAccess')}</ThemedText>
      <ThemedText>{t('BCSC.AdditionalEvidence.LimitedAccessDescription')}</ThemedText>
    </ScreenWrapper>
  )
}

export default AdditionalIdentificationRequiredScreen
