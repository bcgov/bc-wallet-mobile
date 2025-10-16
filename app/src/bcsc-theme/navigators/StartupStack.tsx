import { testIdWithKey, useDefaultStackOptions, useServices, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

interface StartupStackProps {
  initializeAgent: (walletSecret: string) => Promise<void>
}

export const StartupStack = (props: StartupStackProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const Stack = createStackNavigator()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [] = useServices([])

  return (
    <Stack.Navigator
      initialRouteName={'tmp'}
      screenOptions={{
        ...defaultStackOptions,
        headerShown: false,
        title: '',
        headerShadowVisible: false,
        headerBackTestID: testIdWithKey('Back'),
        headerBackAccessibilityLabel: t('Global.Back'),
      }}
    ></Stack.Navigator>
  )
}
