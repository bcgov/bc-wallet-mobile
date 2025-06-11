import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { WorkflowProvider, WorkflowStep } from '@/contexts/WorkFlowContext'
import { createStackNavigator } from '@react-navigation/stack'
import IdentitySelectionScreen from './IdentitySelectionScreen'
import { LoadingScreen } from '../loading/LoadingScreen'
import IdentityDescriptionScreen from './IdentityDescriptionScreen'
import EnterBirthdateScreen from './EnterBirthdateScreen'
import VerifyCodeScreen from './VerifyCodeScreen'
import EnterSerialNumberScreen from './EnterSerialNumberScreen'
import SelectVerificationMethodScreen from './SelectVerificationMethodScreen'
import SetupSetsScreen from './SetupSetsScreen'

// This stack will be in charge of all steps taken for verifying a person's identity
const workflowSteps: WorkflowStep[] = [
  {
    name: BCSCScreens.SetupSteps,
    component: SetupSetsScreen,
    weight: 0.9,
  },
  {
    name: BCSCScreens.IdentitySelection,
    component: IdentitySelectionScreen,
    weight: 1.0,
  },
  {
    name: BCSCScreens.IdentityDescription,
    component: IdentityDescriptionScreen,
    weight: 1.1,
  },
  {
    name: BCSCScreens.EnterEvidence,
    component: EnterSerialNumberScreen,
    weight: 1.2,
  },
  {
    name: BCSCScreens.EnterBirthdate,
    component: EnterBirthdateScreen,
    weight: 1.3,
  },
  {
    name: 'Validate Serial Number and birthdate',
    weight: 1.31,
    handler: async ({ step }) => {
      console.log('FETCH STORE DATA AND VALIDATE SERIAL NUMBER AND BIRTHDATE')
      console.log('ALSO FETCH EMAIL AND ADDRESS IS AVAILABLE AND ADD TO STORE')
      // TODO: how will the error handling work within a workflow? should we add an error page to 'skip' to?
      // or would the error just appear overtop of the current screen like a modal
      await new Promise((resolve) => setTimeout(resolve, 2000))
    },
  },
  {
    name: BCSCScreens.SelectVerificationMethod,
    component: SelectVerificationMethodScreen,
    weight: 1.4,
  },
  {
    name: BCSCScreens.VerifyInPersonCode,
    component: VerifyCodeScreen,
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
