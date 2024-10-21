import { useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'

import HelpCenter from '../screens/HelpCenter'

import { Screens, HelpCenterStackParams } from './navigators'

const HelpCenterStack: React.FC = () => {
  const StackHelp = createStackNavigator<HelpCenterStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <StackHelp.Navigator
      initialRouteName={Screens.HelpCenter}
      screenOptions={{ ...defaultStackOptions, headerShown: true }}
    >
      <StackHelp.Screen name={Screens.HelpCenter} component={HelpCenter} />
    </StackHelp.Navigator>
  )
}

export default HelpCenterStack
