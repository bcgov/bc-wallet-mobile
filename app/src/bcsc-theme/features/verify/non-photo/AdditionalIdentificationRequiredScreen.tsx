import { BulletedInstructionsScreen } from '@/bcsc-theme/components/BulletedInstructionsScreen'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { BCSCCardProcess } from 'react-native-bcsc-core'

type AdditionalIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const AdditionalIdentificationRequiredScreen: React.FC<AdditionalIdentificationRequiredScreenProps> = ({
  navigation,
}: AdditionalIdentificationRequiredScreenProps) => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()

  return (
    <BulletedInstructionsScreen
      heading={t('BCSC.AdditionalEvidence.PhotoRequired')}
      description={t('BCSC.AdditionalEvidence.PhotoRequiredDescription')}
      sections={[
        {
          heading: t('BCSC.AdditionalEvidence.CheckYourID'),
          bullets: [
            'BCSC.AdditionalEvidence.CheckYourIDBullet1',
            'BCSC.AdditionalEvidence.CheckYourIDBullet2',
            'BCSC.AdditionalEvidence.CheckYourIDBullet3',
          ],
        },
        {
          heading: t('BCSC.AdditionalEvidence.LimitedAccess'),
          paragraph: t('BCSC.AdditionalEvidence.LimitedAccessDescription'),
        },
      ]}
      primaryAction={{
        label: t('Global.Continue'),
        onPress: () => {
          navigation.navigate(BCSCScreens.EvidenceTypeList, {
            // The cardProcess should have been defined prior to reaching this screen.
            // @see EnterBirthdateViewModel.authorizeDevice()
            cardProcess: store.bcscSecure.cardProcess ?? BCSCCardProcess.None,
            // Non-photo BCSC users see photo IDs first, with an "Other Options" escape hatch
            photoFilter: 'photo',
          })
        },
      }}
    />
  )
}

export default AdditionalIdentificationRequiredScreen
