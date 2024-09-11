import { useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { Platform } from 'react-native'

import Terms from '../screens/Terms'

import { Screens, TermsStackParams } from './navigators'

const TermsStack: React.FC = () => {
  const StackTerms = createStackNavigator<TermsStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <StackTerms.Navigator initialRouteName={Screens.TermsAndConditions} screenOptions={{ ...defaultStackOptions }}>
      <StackTerms.Screen
        name={Screens.TermsAndConditions}
        component={Terms}
        options={{
          headerTitle: '',
          headerStyle: {
            height: Platform.OS == 'ios' ? 50 : 0,
          },
          headerLeft: () => undefined,
        }}
      />
    </StackTerms.Navigator>
  )
}

export default TermsStack
