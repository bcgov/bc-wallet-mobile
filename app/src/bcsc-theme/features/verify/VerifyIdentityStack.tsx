import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Stacks, testIdWithKey, TOKENS, useDefaultStackOptions, useServices, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { HeaderBackButton } from '@react-navigation/elements'
import SetupStepsScreen from './SetupStepsScreen'
import HelpHeaderButton from '@/bcsc-theme/components/HelpHeaderButton'
import IdentitySelectionScreen from './IdentitySelectionScreen'
import SerialInstructionsScreen from './SerialInstructionsScreen'
import ManualSerialScreen from './ManualSerialScreen'
import EnterBirthdateScreen from './EnterBirthdateScreen'
import VerificationMethodSelectionScreen from './VerificationMethodSelectionScreen'
import VerifyInPersonScreen from './VerifyInPersonScreen'
import MismatchedSerialScreen from './MismatchedSerialScreen'
import VerificationSuccessScreen from './VerificationSuccessScreen'
import { CommonActions } from '@react-navigation/native'
import { useEffect } from 'react'
import useApi from '@/bcsc-theme/api/hooks/useApi'

const VerifyIdentityStack = () => {
  const Stack = createStackNavigator<BCSCVerifyIdentityStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const { registration } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  useEffect(() => {
    registration.register()
      .catch((error) => {
        logger.error(`Error during registration: ${error}`)
        // Handle error appropriately, e.g., show an alert or log it
      })
      // TODO: registration shouldn't actually be called here, this is just temporary until we move the flow where it should be
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions, headerShown: true, title: '' }}>
      <Stack.Screen
        name={BCSCScreens.SetupSteps}
        component={SetupStepsScreen}
        options={({ navigation }) => ({
          title: 'Setup Steps',
          headerRight: HelpHeaderButton,
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              testID={testIdWithKey('Back')}
              onPress={() => {
                navigation.getParent()?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: Stacks.TabStack }] }))
              }}
            />
          ),
        })}
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
        name={BCSCScreens.VerificationSuccess}
        component={VerificationSuccessScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  )
}

export default VerifyIdentityStack
