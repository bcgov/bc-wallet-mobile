import { createFloatingHelpMenuButton } from '@/bcsc-theme/components/FloatingHelpMenuHeaderButton'
import { createHeaderWithoutBanner } from '@/bcsc-theme/components/HeaderWithBanner'
import { BCSCPromptStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { DEFAULT_HEADER_TITLE_CONTAINER_STYLE, HelpCentreUrl } from '@/constants'
import { useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'

import { createHeaderBackButton } from '../components/HeaderBackButton'
import { VerifyPromptScreen } from '../features/onboarding/VerifyPromptScreen'
import { WebViewScreen } from '../features/webview/WebViewScreen'

/**
 * Wraps the verify prompt in a single-screen stack so it gets the same themed header
 * (banner + title) as the screens in OnboardingStack / MainStack.
 *
 * Can add future one-time prompts to this stack as needed
 */
const PromptStack: React.FC = () => {
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const Stack = createStackNavigator<BCSCPromptStackParams>()

  return (
    <Stack.Navigator
      screenOptions={{
        ...defaultStackOptions,
        headerShown: true,
        headerLeft: () => null,
        headerBackTitleVisible: false,
        headerTitleContainerStyle: DEFAULT_HEADER_TITLE_CONTAINER_STYLE,
        header: createHeaderWithoutBanner,
        headerRight: createFloatingHelpMenuButton({
          webViewScreen: BCSCScreens.PromptWebView,
          learnMoreUrl: HelpCentreUrl.HOW_TO_SETUP,
        }),
        title: '',
      }}
    >
      <Stack.Screen name={BCSCScreens.VerifyPrompt} component={VerifyPromptScreen} />
      <Stack.Screen
        name={BCSCScreens.PromptWebView}
        component={WebViewScreen}
        // This stack hides the back button by default (the prompt is a root screen), so the
        // WebView opened from the help menu needs its own back button to return to the prompt.
        options={({ route }) => ({
          title: route.params.title,
          headerLeft: createHeaderBackButton,
        })}
      />
    </Stack.Navigator>
  )
}

export default PromptStack
