import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointList from '@/components/BulletPointList'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { BCSCCardProcess } from 'react-native-bcsc-core'

type DualIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.DualIdentificationRequired>
}

/**
 * Renders an instructions screen, when users are registering non-bcsc cards.
 * It explains, what access the user will have and what types of cards are required during the setup.
 *
 * @returns {*} {React.ReactElement}
 */
const DualIdentificationRequiredScreen: React.FC<DualIdentificationRequiredScreenProps> = ({
  navigation,
}: DualIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const controls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey(t('Global.Continue'))}
        onPress={() => {
          navigation.navigate(BCSCScreens.EvidenceTypeList, { cardProcess: BCSCCardProcess.NonBCSC })
        }}
        buttonType={ButtonType.Primary}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ flexGrow: 1, gap: Spacing.md, padding: Spacing.xl }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.DualNonBCSCEvidence.Heading')}</ThemedText>
      <ThemedText>{t('BCSC.DualNonBCSCEvidence.Description')}</ThemedText>
      <ThemedText variant={'headingFour'}>{t('BCSC.DualNonBCSCEvidence.CheckYourID')}</ThemedText>
      <BulletPointList
        translationKeys={[
          'BCSC.DualNonBCSCEvidence.CheckYourIDBullet1',
          'BCSC.DualNonBCSCEvidence.CheckYourIDBullet2',
          'BCSC.DualNonBCSCEvidence.CheckYourIDBullet3',
          'BCSC.DualNonBCSCEvidence.CheckYourIDBullet4',
        ]}
        iconColor={ColorPalette.brand.icon}
        iconSize={Spacing.xs}
      />
      <ThemedText variant={'headingFour'}>{t('BCSC.AdditionalEvidence.LimitedAccess')}</ThemedText>
      <ThemedText>{t('BCSC.AdditionalEvidence.LimitedAccessDescription')}</ThemedText>
    </ScreenWrapper>
  )
}

export default DualIdentificationRequiredScreen
