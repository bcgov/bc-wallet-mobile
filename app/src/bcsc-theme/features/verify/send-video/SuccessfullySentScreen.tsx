import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

type SuccessfullySentScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SuccessfullySent>
}

const SuccessfullySentScreen = ({ navigation }: SuccessfullySentScreenProps) => {
  const { t } = useTranslation()
  return (
    <StatusDetails
      title={t('Unified.SendVideo.SuccessfullySent.Heading')}
      description={t('Unified.SendVideo.SuccessfullySent.Description1')}
      bullets={[t('Unified.SendVideo.SuccessfullySent.Bullet1'), t('Unified.SendVideo.SuccessfullySent.Bullet2')]}
      extraText={t('Unified.SendVideo.SuccessfullySent.Description3')}
      buttonText={t('Unified.SendVideo.SuccessfullySent.ButtonText')}
      onButtonPress={() =>
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
      }
    />
  )
}
export default SuccessfullySentScreen
