import { ButtonLocation, IconButton, testIdWithKey, useStore, useTour } from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import { BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'
import { BCDispatchAction, BCState } from '@/store'
import { getToken, TokenType } from 'react-native-bcsc-core'
import client from '../api/client'

const MainStack: React.FC = () => {
  const { t } = useTranslation()
  const { currentStep } = useTour()
  const Stack = createStackNavigator()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])
  const [store, dispatch] = useStore<BCState>()

  useEffect(() => {
    const setApiClientTokens = async () => {
      let token
      // take response and build the data
      if (store.bcsc.refreshToken) {
        // fetch token data and save it son
        const tokenInfo = await getToken(TokenType.Refresh)
        token = tokenInfo?.token
        dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [token] })
      } else {
        token = store.bcsc.refreshToken
      }

      if (token) {
        await client.setTokensForRefreshToken(token)
      }
    }
    setApiClientTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const headerRight = () => (
    <IconButton
      buttonLocation={ButtonLocation.Right}
      accessibilityLabel={t('Global.Help')}
      testID={testIdWithKey('Help')}
      onPress={() => {
        // TODO: Implement help functionality
      }}
      icon={'help-circle-outline'}
    />
  )

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <Stack.Navigator initialRouteName={BCSCStacks.TabStack} screenOptions={{ headerShown: false }}>
        <Stack.Screen name={BCSCStacks.TabStack} component={BCSCTabStack} />
        <Stack.Screen
          name={BCSCScreens.ManualPairingCode}
          component={ManualPairingCode}
          options={() => ({
            headerShown: true,
            title: '',
            headerBackTitleVisible: false,
            headerBackTestID: testIdWithKey('Back'),
            headerRight,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.PairingConfirmation}
          component={PairingConfirmation}
          options={() => ({
            headerShown: true,
            title: '',
            headerLeft: () => null,
          })}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
