import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import Language from '@hyperledger/aries-bifold-core/App/screens/Language'
import PINCreate from '@hyperledger/aries-bifold-core/App/screens/PINCreate'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import HistoryPage from '../screens/HistoryPage'
import Settings from '../screens/Settings'

import { Screens, SettingStackParams } from './navigators'

const SettingsStack: React.FC = () => {
  const StackSettings = createStackNavigator<SettingStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [UseBiometry] = useServices([TOKENS.SCREEN_USE_BIOMETRY])
  const { t } = useTranslation()

  return (
    <StackSettings.Navigator initialRouteName={Screens.Settings} screenOptions={{ ...defaultStackOptions }}>
      <StackSettings.Screen
        name={Screens.Settings}
        component={Settings}
        options={{
          title: t('RootStack.Settings'),
        }}
      />
      <StackSettings.Screen name={Screens.Language} component={Language} />
      <StackSettings.Screen
        name={Screens.HistoryPage}
        component={HistoryPage}
        options={{
          title: t('Settings.History'),
        }}
      />
      <StackSettings.Screen
        name={Screens.Notification}
        component={HistoryPage}
        options={{
          title: t('Settings.History'),
        }}
      />
      <StackSettings.Screen
        name={Screens.CreatePIN}
        component={PINCreate}
        options={{
          title: t('Screens.ChangePIN'),
        }}
      />
      <StackSettings.Screen
        name={Screens.UseBiometry}
        component={UseBiometry}
        options={{
          title: t('Screens.Biometry'),
        }}
      />
    </StackSettings.Navigator>
  )
}

export default SettingsStack
