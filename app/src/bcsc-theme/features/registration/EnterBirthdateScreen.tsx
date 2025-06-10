import { View, Text, Button } from 'react-native'
import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'

type EnterBirthdateScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.EnterBirthdate>
  route: { params: { stepIndex: number } }
}
const EnterBirthdateScreen: React.FC<EnterBirthdateScreenProps> = ({ navigation, route }) => {
  console.log('ENTER BIRTHDATE SCREEN RENDERED')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  return (
    <View>
      <Text>BIRTHDATE PLS</Text>
      <Button title="Accept" onPress={() => nextStep(navigation, stepIndex)} />
    </View>
  )
}
export default EnterBirthdateScreen
