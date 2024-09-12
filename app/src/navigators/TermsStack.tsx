import { useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'

import Terms from '../screens/Terms'

import { Screens, TermsStackParams } from './navigators'

const TermsStack: React.FC = () => {
  const StackTerms = createStackNavigator<TermsStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <StackTerms.Navigator
      initialRouteName={Screens.TermsAndConditions}
      screenOptions={{ ...defaultStackOptions, headerShown: false }}
    >
      <StackTerms.Screen name={Screens.TermsAndConditions} component={Terms} />
    </StackTerms.Navigator>
  )
}

export default TermsStack
