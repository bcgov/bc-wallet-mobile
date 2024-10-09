import { useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'

import ActivityNotifications from '../screens/activities/Activities'

import { ActivitiesStackParams, Screens } from './navigators'

const ActivitiesStack: React.FC = () => {
  const StackActivities = createStackNavigator<ActivitiesStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <StackActivities.Navigator
      initialRouteName={Screens.Activities}
      screenOptions={{ ...defaultStackOptions, headerShown: true }}
    >
      <StackActivities.Screen name={Screens.Activities} component={ActivityNotifications} />
    </StackActivities.Navigator>
  )
}

export default ActivitiesStack
