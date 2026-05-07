import { Screens, testIdWithKey, useDefaultStackOptions, useTheme } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { createHeaderBackButton } from '../components/HeaderBackButton'
import { AgentReadyGate } from '../features/agent'
import ConnectionLoadingScreen from '../features/scan/ConnectionLoadingScreen'
import ScanScreen from '../features/scan/ScanScreen'
import { BCSCScanStackParams, BCSCScreens } from '../types/navigators'

/**
 * BCSC's Scan screen wraps Bifold's ScanCamera and dispatches scanned URIs through
 * the strategy ViewModel — bypassing Bifold's connectFromScanOrDeepLink which
 * hardcodes route names (Stacks.ConnectionStack/Screens.Connection) that BCSC
 * doesn't register. The agent gate prevents the screen from mounting before the
 * BCSC agent is live, since the URI strategies need the agent for OOB parsing.
 */
const ScopedScanScreen: React.FC<React.ComponentProps<typeof ScanScreen>> = (props) => (
  <AgentReadyGate testID={testIdWithKey('Scan.Loading')}>
    <ScanScreen {...props} />
  </AgentReadyGate>
)

const BCSCScanStack: React.FC = () => {
  const Stack = createStackNavigator<BCSCScanStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const { t } = useTranslation()

  return (
    <Stack.Navigator
      screenOptions={{
        ...defaultStackOptions,
        headerShown: true,
        headerLeft: createHeaderBackButton,
        headerBackTestID: testIdWithKey('Back'),
      }}
    >
      <Stack.Screen name={Screens.Scan} component={ScopedScanScreen} options={{ title: t('Screens.Scan') }} />
      <Stack.Screen
        name={BCSCScreens.ConnectionLoading}
        component={ConnectionLoadingScreen}
        options={{ title: t('BCSC.Scan.Connecting'), headerLeft: () => null }}
      />
    </Stack.Navigator>
  )
}

export default BCSCScanStack
