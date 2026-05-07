import { createHeaderWithoutBanner } from '@/bcsc-theme/components/HeaderWithBanner'
import { DEFAULT_HEADER_TITLE_CONTAINER_STYLE } from '@/constants'
import { useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'

import { createHeaderRightMoreButton } from '@/bcsc-theme/components/HeaderRightMoreButton'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { VerifyPromptScreen } from '../features/onboarding/VerifyPromptScreen'

/**
 * Wraps the verify prompt in a single-screen stack so it gets the same themed header
 * (banner + title) as the screens in OnboardingStack / MainStack.
 *
 * Can add future one-time prompts to this stack as needed
 */
const PromptStack: React.FC = () => {
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const Stack = createStackNavigator()

  return (
    <Stack.Navigator
      screenOptions={{
        ...defaultStackOptions,
        headerShown: true,
        headerLeft: () => null,
        headerBackTitleVisible: false,
        headerTitleContainerStyle: DEFAULT_HEADER_TITLE_CONTAINER_STYLE,
        header: createHeaderWithoutBanner,
        headerRight: createHeaderRightMoreButton,
        title: '',
      }}
    >
      <Stack.Screen name={BCSCScreens.VerifyPrompt} component={VerifyPromptScreen} />
    </Stack.Navigator>
  )
}

export default PromptStack
