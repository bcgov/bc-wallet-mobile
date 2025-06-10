import { View, Text, Button } from 'react-native'
import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'

type VerifyCodeScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.IdentitySelection>
  route: { params: { stepIndex: number } }
}
const VerifyCodeScreen: React.FC<VerifyCodeScreenProps> = ({ navigation, route }) => {
  console.log('Verify Code COMPONENT RENDERED')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  return (
    <View>
      <Text>Verify Code at local place please...</Text>
      <Button title="Accept" onPress={() => nextStep(navigation, stepIndex)} />
    </View>
  )
}
export default VerifyCodeScreen
