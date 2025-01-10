import { useTheme } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import ListContacts from '@hyperledger/aries-bifold-core/App/screens/ListContacts'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import Plus from '../screens/Plus'

import AboutStack from './AboutStack'
import HelpCenterStack from './HelpCenterStack'
import SettingStack from './SettingStack'
import { Screens, OptionsPlusStackParams, Stacks } from './navigators'

const PlusStack: React.FC = () => {
  const StackPlus = createStackNavigator<OptionsPlusStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const { t } = useTranslation()

  return (
    <StackPlus.Navigator initialRouteName={Screens.OptionsPlus} screenOptions={{ ...defaultStackOptions }}>
      <StackPlus.Screen
        name={Screens.OptionsPlus}
        component={Plus}
        options={{
          title: t('Screens.OptionsPlus'),
        }}
      />
      <StackPlus.Screen
        name={Screens.Contacts}
        component={ListContacts}
        options={{
          title: t('Screens.Contacts'),
        }}
      />
      <StackPlus.Screen
        name={Stacks.SettingsStack}
        component={SettingStack}
        options={{
          headerShown: false,
        }}
      />
      <StackPlus.Screen
        name={Stacks.HelpCenterStack}
        component={HelpCenterStack}
        options={{
          headerShown: false,
        }}
      />
      <StackPlus.Screen
        name={Stacks.AboutStack}
        component={AboutStack}
        options={{
          headerShown: false,
        }}
      />
    </StackPlus.Navigator>
  )
}

export default PlusStack
