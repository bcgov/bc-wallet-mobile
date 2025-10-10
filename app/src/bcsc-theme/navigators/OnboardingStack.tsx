import { createStackNavigator } from '@react-navigation/stack'
import { View } from 'react-native'
import BCSCPreface from '../features/onboarding/Preface'
import { BCSCStacks } from '../types/navigators'
import { useDefaultStackOptions, useTheme } from '@bifold/core'

const OnboardingStack: React.FC = () => {
  const theme = useTheme()
  const Stack = createStackNavigator()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        initialRouteName={BCSCStacks.OnboardingStack}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
          title: '',
        }}
      >
        <Stack.Screen name="Preface" component={BCSCPreface} />
      </Stack.Navigator>
    </View>
  )
}

export default OnboardingStack
