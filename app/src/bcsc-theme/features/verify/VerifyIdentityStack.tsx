import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import SetupStepsScreen from './SetupStepsScreen'
import HelpHeaderButton from '@/bcsc-theme/components/HelpHeaderButton'
import IdentitySelectionScreen from './IdentitySelectionScreen'
import SerialInstructionsScreen from './SerialInstructionsScreen'
import ManualSerialScreen from './ManualSerialScreen'
import EnterBirthdateScreen from './EnterBirthdateScreen'
import VerificationMethodSelectionScreen from './VerificationMethodSelectionScreen'
import VerifyInPersonScreen from './in-person/VerifyInPersonScreen'
import MismatchedSerialScreen from './MismatchedSerialScreen'
import VerificationSuccessScreen from './VerificationSuccessScreen'
import InformationRequiredScreen from './send-video/InformationRequiredScreen'

const VerifyIdentityStack = () => {
  const Stack = createStackNavigator<BCSCVerifyIdentityStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions, headerShown: true, title: '' }}>
      <Stack.Screen
        name={BCSCScreens.SetupSteps}
        component={SetupStepsScreen}
        options={{
          title: 'Setup Steps',
          headerRight: HelpHeaderButton,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name={BCSCScreens.IdentitySelection} component={IdentitySelectionScreen} />
      <Stack.Screen name={BCSCScreens.SerialInstructions} component={SerialInstructionsScreen} />
      <Stack.Screen name={BCSCScreens.ManualSerial} component={ManualSerialScreen} />
      <Stack.Screen name={BCSCScreens.EnterBirthdate} component={EnterBirthdateScreen} />
      <Stack.Screen name={BCSCScreens.MismatchedSerial} component={MismatchedSerialScreen} />
      <Stack.Screen
        name={BCSCScreens.VerificationMethodSelection}
        component={VerificationMethodSelectionScreen}
        options={{ title: 'Choose How to Verify', headerRight: HelpHeaderButton }}
      />
      <Stack.Screen
        name={BCSCScreens.VerifyInPerson}
        component={VerifyInPersonScreen}
        options={{ headerRight: HelpHeaderButton }}
      />
      <Stack.Screen
        name={BCSCScreens.InformationRequired}
        component={InformationRequiredScreen}
        options={{ title: 'Information Required' }}
      />
      <Stack.Screen
        name={BCSCScreens.VerificationSuccess}
        component={VerificationSuccessScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  )
}

export default VerifyIdentityStack
