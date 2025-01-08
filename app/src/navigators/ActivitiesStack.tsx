import { useTheme, Screens as BifoldScreens } from '@hyperledger/aries-bifold-core'
import { useDefaultStackOptions } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import ContactDetails from '@hyperledger/aries-bifold-core/App/screens/ContactDetails'
import CredentialDetails from '@hyperledger/aries-bifold-core/App/screens/CredentialDetails'
import ProofDetails from '@hyperledger/aries-bifold-core/App/screens/ProofDetails'
import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import ActivityNotifications from '../screens/activities/Activities'
import BiometricChangeDetails from '../screens/activities/BiometricChangeDetails'
import CardHistoryDetails from '../screens/activities/CardHistoryDetails'
import ContactHistoryDetails from '../screens/activities/ContactHistoryDetails'
import PinChangeDetails from '../screens/activities/PinChangeDetails'

import { ActivitiesStackParams, Screens } from './navigators'

const ActivitiesStack: React.FC = () => {
  const StackActivities = createStackNavigator<ActivitiesStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const { t } = useTranslation()

  return (
    <StackActivities.Navigator
      initialRouteName={Screens.Activities}
      screenOptions={{ ...defaultStackOptions, headerShown: true }}
    >
      <StackActivities.Screen
        name={Screens.Activities}
        component={ActivityNotifications}
        options={{ title: t('TabStack.Activities') }}
      />
      <StackActivities.Screen
        name={BifoldScreens.ProofDetails}
        component={ProofDetails}
        options={{ title: t('Screens.ProofDetails') }}
      />
      <StackActivities.Screen
        name={Screens.PinChangeDetails}
        component={PinChangeDetails}
        options={{ title: t('History.CardTitle.WalletPinUpdated') }}
      />
      <StackActivities.Screen
        name={Screens.BiometricChangeDetails}
        component={BiometricChangeDetails}
        options={({ route }) => ({
          title: t('History.CardTitle.BiometricUpdated', { operation: route.params?.operation }),
        })}
      />
      <StackActivities.Screen
        name={BifoldScreens.CredentialDetails}
        component={CredentialDetails}
        options={{ title: t('History.CardTitle.CardAccepted') }}
      />
      <StackActivities.Screen
        name={Screens.CardHistoryDetails}
        component={CardHistoryDetails}
        options={({ route }) => ({
          title: t('History.CardTitle.CardChanged', { operation: route.params?.operation }),
        })}
      />
      <StackActivities.Screen
        name={BifoldScreens.ContactDetails}
        component={ContactDetails}
        options={{ title: t('Screens.ContactDetails') }}
      />
      <StackActivities.Screen
        name={Screens.ContactHistoryDetails}
        component={ContactHistoryDetails}
        options={({ route }) => ({
          title: t('History.CardTitle.ContactUpdated', { operation: route.params?.operation }),
        })}
      />
    </StackActivities.Navigator>
  )
}

export default ActivitiesStack
