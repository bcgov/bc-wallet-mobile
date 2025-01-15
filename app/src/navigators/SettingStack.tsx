import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import Language from '@hyperledger/aries-bifold-core/App/screens/Language'
import PINCreate from '@hyperledger/aries-bifold-core/App/screens/PINCreate'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import HelpCenterButton from '../components/Help/HelpCenterButton'
import Settings from '../screens/Settings'

import { Screens, SettingStackParams } from './navigators'

const SettingsStack: React.FC = () => {
  const StackSettings = createStackNavigator<SettingStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [UseBiometry, ScreenOptionsDictionary] = useServices([TOKENS.SCREEN_USE_BIOMETRY, TOKENS.OBJECT_SCREEN_CONFIG])
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
      <StackSettings.Screen
        name={Screens.Language}
        component={Language}
        options={{
          title: t('Screens.Language'),
          ...ScreenOptionsDictionary[Screens.Language],
        }}
      />
      <StackSettings.Screen
        name={Screens.CreatePIN}
        component={PINCreate}
        options={{
          title: t('Screens.ChangePIN'),
          headerRight: HelpCenterButton,
          gestureEnabled: true,
        }}
      />
      <StackSettings.Screen
        name={Screens.UseBiometry}
        component={UseBiometry}
        options={{
          title: t('Screens.Biometry'),
          headerRight: HelpCenterButton,
        }}
      />
    </StackSettings.Navigator>
  )
}

export default SettingsStack
