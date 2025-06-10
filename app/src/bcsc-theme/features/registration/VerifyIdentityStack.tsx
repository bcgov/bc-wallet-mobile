import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { WorkflowProvider, WorkflowStep } from '@/contexts/WorkFlowContext'
import { createStackNavigator } from '@react-navigation/stack'
import IdentitySelectionScreen from './IdentitySelectionScreen'
import { BCScreens } from '@/bcsc-theme/_old/types/navigators'
import { Text } from 'react-native'
import { LoadingScreen } from '../loading/LoadingScreen'

/*

  ID selection
  ID description
  Scan or Enter Manually (skip a step)
  Scan page
  Enter manually page
  Enter Birthdate
  Error page
  Make call to fetch address 
  Make call to fetch email
  Select Verification options
  See code screen
  
*/

// This stack will be in charge of all steps taken for verifying a person's identity
const workflowSteps: WorkflowStep[] = [
  {
    name: BCSCScreens.IdentitySelection,
    component: IdentitySelectionScreen,
    weight: 1.0,
  },
  {
    name: BCSCScreens.IdentityDescription,
    component: IdentitySelectionScreen,
    weight: 1.1,
  },
  {
    name: BCSCScreens.EnterEvidence,
    component: IdentitySelectionScreen,
    weight: 1.2,
  },
  {
    name: BCSCScreens.EnterBirthdate,
    component: IdentitySelectionScreen,
    weight: 1.3,
  },
  {
    name: BCSCScreens.SelectVerificationMethod,
    component: IdentitySelectionScreen,
    weight: 1.4,
  },
  {
    name: BCSCScreens.VerifyInPersonCode,
    component: IdentitySelectionScreen,
    weight: 1.4,
  },
]
const VerifyIdentityStack = () => {
  const Stack = createStackNavigator<BCSCVerifyIdentityStackParamList>()
  return (
    <WorkflowProvider steps={workflowSteps}>
      <Stack.Navigator>
        <Stack.Screen
          name={BCSCScreens.Loading}
          component={LoadingScreen}
          options={{ headerShown: false }}
          initialParams={{ stepIndex: 0 }}
        />
        {workflowSteps.map((step, index) =>
          step.component ? (
            <Stack.Screen
              key={step.name}
              name={step.name as keyof BCSCVerifyIdentityStackParamList}
              component={step.component}
              options={{ headerShown: true }}
              initialParams={{ stepIndex: index }}
            />
          ) : null
        )}
      </Stack.Navigator>
    </WorkflowProvider>
  )
}

export default VerifyIdentityStack
