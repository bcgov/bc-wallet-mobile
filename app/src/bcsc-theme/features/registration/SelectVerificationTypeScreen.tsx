import { View, Text, Button } from 'react-native'
import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'

type IdentityDescriptionScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.IdentityDescription>
  route: { params: { stepIndex: number } }
}
const SelectVerificationTypeScreen: React.FC<IdentityDescriptionScreenProps> = ({ navigation, route }) => {
  console.log('SHOW VERIFY IN PERSON CODE COMPONENT RENDERED')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  return (
    <View>
      <Text>SHOW A CODE FOR THIS THING PLS</Text>
      <Button title="Accept" onPress={() => nextStep(navigation, stepIndex)} />
    </View>
  )
}
export default SelectVerificationTypeScreen
