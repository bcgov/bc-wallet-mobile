import { useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import HelpCenter from '../screens/HelpCenter'
import HelpCenterPage from '../screens/HelpCenterPage'

import { Screens, HelpCenterStackParams } from './navigators'

const HelpCenterStack: React.FC = () => {
  const StackHelp = createStackNavigator<HelpCenterStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const { t } = useTranslation()

  return (
    <StackHelp.Navigator
      initialRouteName={Screens.HelpCenter}
      screenOptions={{ ...defaultStackOptions, headerShown: true }}
    >
      <StackHelp.Screen
        name={Screens.HelpCenter}
        component={HelpCenter}
        options={{
          title: t('Screens.HelpCenter'),
        }}
      />
      <StackHelp.Screen
        name={Screens.HelpCenterPage}
        component={HelpCenterPage}
        options={{
          title: t('Screens.HelpCenter'),
        }}
      />
    </StackHelp.Navigator>
  )
}

export default HelpCenterStack
