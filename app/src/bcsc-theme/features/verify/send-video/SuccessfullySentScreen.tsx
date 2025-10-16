import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

type SuccessfullySentScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.SuccessfullySent>
}

const SuccessfullySentScreen = ({ navigation }: SuccessfullySentScreenProps) => {
  return (
    <StatusDetails
      title={`We've received your request to verify your identity.`}
      description={`We review requests:`}
      bullets={['Monday to Friday, 9am to 5pm', "In the order they're received"]}
      extraText={`Usually, we review requests within 24 hours.\nYou'll get an email after we review your request. You can also check the status in this app.`}
      buttonText={'Ok'}
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
