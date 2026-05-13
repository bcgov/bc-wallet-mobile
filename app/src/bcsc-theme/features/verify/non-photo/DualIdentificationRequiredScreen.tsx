import { BulletedInstructionsScreen } from '@/bcsc-theme/components/BulletedInstructionsScreen'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { BCSCCardProcess } from 'react-native-bcsc-core'

type DualIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.DualIdentificationRequired>
}

/**
 * Renders an instructions screen, when users are registering non-bcsc cards.
 * It explains, what access the user will have and what types of cards are required during the setup.
 */
const DualIdentificationRequiredScreen: React.FC<DualIdentificationRequiredScreenProps> = ({
  navigation,
}: DualIdentificationRequiredScreenProps) => {
  const { t } = useTranslation()

  return (
    <BulletedInstructionsScreen
      heading={t('BCSC.DualNonBCSCEvidence.Heading')}
      description={t('BCSC.DualNonBCSCEvidence.Description')}
      sections={[
        {
          heading: t('BCSC.DualNonBCSCEvidence.CheckYourID'),
          bullets: [
            'BCSC.DualNonBCSCEvidence.CheckYourIDBullet1',
            'BCSC.DualNonBCSCEvidence.CheckYourIDBullet2',
            'BCSC.DualNonBCSCEvidence.CheckYourIDBullet3',
            'BCSC.DualNonBCSCEvidence.CheckYourIDBullet4',
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
          navigation.navigate(BCSCScreens.EvidenceTypeList, { cardProcess: BCSCCardProcess.NonBCSC })
        },
      }}
    />
  )
}

export default DualIdentificationRequiredScreen
