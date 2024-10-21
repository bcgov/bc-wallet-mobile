import { useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'

import About from '../screens/About'

import { Screens, AboutStackParams } from './navigators'

const AboutStack: React.FC = () => {
  const StackAbout = createStackNavigator<AboutStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <StackAbout.Navigator
      initialRouteName={Screens.About}
      screenOptions={{ ...defaultStackOptions, headerShown: true }}
    >
      <StackAbout.Screen name={Screens.About} component={About} />
    </StackAbout.Navigator>
  )
}

export default AboutStack
