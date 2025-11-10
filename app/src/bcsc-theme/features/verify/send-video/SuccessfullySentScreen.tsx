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
      title={t('BCSC.SendVideo.SuccessfullySent.Heading')}
      description={t('BCSC.SendVideo.SuccessfullySent.Description1')}
      bullets={[t('BCSC.SendVideo.SuccessfullySent.Bullet1'), t('BCSC.SendVideo.SuccessfullySent.Bullet2')]}
      extraText={t('BCSC.SendVideo.SuccessfullySent.Description3')}
      buttonText={t('BCSC.SendVideo.SuccessfullySent.ButtonText')}
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
