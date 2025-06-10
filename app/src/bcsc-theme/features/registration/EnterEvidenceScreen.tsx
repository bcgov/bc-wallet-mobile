import { View, Text, Button } from 'react-native'
import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'

type IdentitySelectionScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.EnterEvidence>
  route: { params: { stepIndex: number } }
}
const EnterEvidenceScreen: React.FC<IdentitySelectionScreenProps> = ({ navigation, route }) => {
  console.log('ENTER EVIDENCE SCREEN RENDERED')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  return (
    <View>
      <Text>ENTER EVIDENCE PLS</Text>
      <Button title="Accept" onPress={() => nextStep(navigation, stepIndex)} />
    </View>
  )
}
export default EnterEvidenceScreen
