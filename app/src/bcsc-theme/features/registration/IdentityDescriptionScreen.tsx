import { View, Text, Button } from 'react-native'
import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'

type IdentityDescriptionScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.IdentitySelection>
  route: { params: { stepIndex: number } }
}
const IdentityDescriptionScreen: React.FC<IdentityDescriptionScreenProps> = ({ navigation, route }) => {
  console.log('IDENTITY SELECTION COMPONENT RENDERED')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  return (
    <View>
      <Text>ID DESCRIPTION</Text>
      <Button title="Accept" onPress={() => nextStep(navigation, stepIndex)} />
    </View>
  )
}
export default IdentityDescriptionScreen
