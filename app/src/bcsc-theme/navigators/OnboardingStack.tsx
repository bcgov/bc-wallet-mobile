import { createStackNavigator } from '@react-navigation/stack'
import { View } from 'react-native'
import { BCSCScreens, BCSCStacks } from '../types/navigators'
import { useDefaultStackOptions, useTheme } from '@bifold/core'
import IntroCarouselScreen from '../features/onboarding/IntroCarousel'

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
        <Stack.Screen name={BCSCScreens.OnboardingIntroCarouselScreen} component={IntroCarouselScreen} />
      </Stack.Navigator>
    </View>
  )
}

export default OnboardingStack
