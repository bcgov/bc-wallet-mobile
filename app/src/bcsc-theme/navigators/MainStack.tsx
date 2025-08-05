import {
  ButtonLocation,
  IconButton,
  testIdWithKey,
  useDefaultStackOptions,
  useStore,
  useTheme,
  useTour,
} from '@bifold/core'
import { createStackNavigator } from '@react-navigation/stack'
import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import ManualPairingCode from '../features/pairing/ManualPairing'
import PairingConfirmation from '../features/pairing/PairingConfirmation'
import WebViewScreen from '../features/webview/WebViewScreen'
import { BCSCRootStackParams, BCSCScreens, BCSCStacks } from '../types/navigators'
import BCSCTabStack from './TabStack'
import client from '../api/client'
import { BCDispatchAction, BCState } from '@/store'

const MainStack: React.FC = () => {
  const { t } = useTranslation()
  const { currentStep } = useTour()
  const [, dispatch] = useStore<BCState>()
  const theme = useTheme()
  const Stack = createStackNavigator<BCSCRootStackParams>()
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])
  const defaultStackOptions = useDefaultStackOptions(theme)

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
      <Stack.Navigator
        initialRouteName={BCSCStacks.TabStack}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
          title: '',
          headerBackTestID: testIdWithKey('Back'),
        }}
      >
        <Stack.Screen name={BCSCStacks.TabStack} component={BCSCTabStack} />
        <Stack.Screen
          name={BCSCScreens.ManualPairingCode}
          component={ManualPairingCode}
          options={() => ({
            headerShown: true,
            headerBackTitleVisible: false,
            headerRight,
          })}
        />
        <Stack.Screen
          name={BCSCScreens.WebView}
          component={WebViewScreen}
          options={({ route, navigation }) => ({
            headerShown: true,
            title: route.params.title,
            headerBackTestID: testIdWithKey('Back'),
            headerLeft: (props: HeaderBackButtonProps) => (
              <HeaderBackButton
                {...props}
                onPress={() => {
                  // Refresh when leaving webviews in case account / device action was taken within the webview
                  if (client.tokens?.refresh_token) {
                    client.getTokensForRefreshToken(client.tokens?.refresh_token).then((tokenData) => {
                      if (tokenData.bcsc_devices_count !== undefined) {
                        dispatch({
                          type: BCDispatchAction.UPDATE_DEVICE_COUNT,
                          payload: [tokenData.bcsc_devices_count],
                        })
                      }
                    })
                  }
                  navigation.goBack()
                }}
              />
            ),
          })}
        />
        <Stack.Screen
          name={BCSCScreens.PairingConfirmation}
          component={PairingConfirmation}
          options={() => ({
            headerShown: true,
            headerLeft: () => null,
          })}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
