import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointList from '@/components/BulletPointList'
import { BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { BCSCCardProcess } from 'react-native-bcsc-core'

type AdditionalIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const AdditionalIdentificationRequiredScreen: React.FC<AdditionalIdentificationRequiredScreenProps> = ({
  navigation,
}: AdditionalIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()

  const controls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey(t('Global.Continue'))}
        onPress={() => {
          navigation.navigate(BCSCScreens.EvidenceTypeList, {
            /**
             * Pass along the card process filter to the EvidenceTypeList screen
             * Note: The cardProcess should have been defined prior to reaching this screen.
             * @see EnterBirthdateViewModel.authorizeDevice()
             */
            cardProcess: store.bcscSecure.cardProcess ?? BCSCCardProcess.None,
            // Non-photo BCSC users see photo IDs first, with an "Other Options" escape hatch
            photoFilter: 'photo',
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
      />
      <ThemedText variant={'headingFour'}>{t('BCSC.AdditionalEvidence.LimitedAccess')}</ThemedText>
      <ThemedText>{t('BCSC.AdditionalEvidence.LimitedAccessDescription')}</ThemedText>
    </ScreenWrapper>
  )
}

export default AdditionalIdentificationRequiredScreen
