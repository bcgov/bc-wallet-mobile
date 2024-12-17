import { ProofState } from '@credo-ts/core'
import { useAgent, useProofByState } from '@credo-ts/react-hooks'
import {
  BifoldError,
  ButtonLocation,
  ConnectStack,
  ContactStack,
  DeliveryStack,
  DispatchAction,
  EventTypes,
  IconButton,
  NotificationStack,
  ProofRequestStack,
  Screens,
  Stacks as Bifoldstacks,
  TOKENS,
  TabStacks,
  testIdWithKey,
  useDeepLinks,
  useDefaultStackOptions,
  useServices,
  useStore,
  useTheme,
} from '@hyperledger/aries-bifold-core'
import HistoryStack from '@hyperledger/aries-bifold-core/App/modules/history/navigation/HistoryStack'
import Chat from '@hyperledger/aries-bifold-core/App/screens/Chat'
import { ProofCustomMetadata, ProofMetadata } from '@hyperledger/aries-bifold-verifier'
import { CardStyleInterpolators, StackCardStyleInterpolator, createStackNavigator } from '@react-navigation/stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter } from 'react-native'

import SettingStack from '../navigators/SettingStack'

import HelpCenterStack from './HelpCenterStack'
import TabStack from './TabStack'
import { RootStackParams, Stacks } from './navigators'

const RootStack: React.FC = () => {
  const [store, dispatch] = useStore()
  const { agent } = useAgent()
  const { t } = useTranslation()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [splash, OnboardingStack, loadState] = useServices([
    TOKENS.SCREEN_SPLASH,
    TOKENS.STACK_ONBOARDING,
    TOKENS.LOAD_STATE,
  ])

  useDeepLinks()

  // remove connection on mobile verifier proofs if proof is rejected regardless of if it has been opened
  const declinedProofs = useProofByState([ProofState.Declined, ProofState.Abandoned])
  useEffect(() => {
    declinedProofs.forEach((proof) => {
      const meta = proof?.metadata?.get(ProofMetadata.customMetadata) as ProofCustomMetadata
      if (meta?.delete_conn_after_seen) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        agent?.connections.deleteById(proof?.connectionId ?? '').catch(() => {})
        proof?.metadata.set(ProofMetadata.customMetadata, { ...meta, delete_conn_after_seen: false })
      }
    })
  }, [declinedProofs, agent, store.preferences.useDataRetention])

  const loadStateErrorTitle = t('Error.Title1044')
  const loadStateErrorDescription = t('Error.Message1044')

  useEffect(() => {
    loadState(dispatch)
      .then(() => {
        dispatch({ type: DispatchAction.STATE_LOADED })
      })
      .catch((err: unknown) => {
        const error = new BifoldError(loadStateErrorTitle, loadStateErrorDescription, (err as Error).message, 1001)
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      })
  }, [dispatch, loadState])

  const mainStack = () => {
    const Stack = createStackNavigator<RootStackParams>()

    // This function is to make the fade in behavior of both iOS and Android consistent for the settings menu
    const forFade: StackCardStyleInterpolator = ({ current }) => ({
      cardStyle: {
        opacity: current.progress,
      },
    })

    return (
      <Stack.Navigator initialRouteName={Screens.Splash} screenOptions={{ ...defaultStackOptions, headerShown: false }}>
        <Stack.Screen name={Screens.Splash} component={splash} />
        <Stack.Screen name={Bifoldstacks.TabStack} component={TabStack} />
        <Stack.Screen
          name={Screens.Chat}
          component={Chat}
          options={({ navigation }) => ({
            headerShown: true,
            title: t('Screens.CredentialOffer'),
            headerLeft: () => (
              <IconButton
                buttonLocation={ButtonLocation.Left}
                accessibilityLabel={t('Global.Back')}
                testID={testIdWithKey('BackButton')}
                onPress={() => {
                  navigation.navigate(TabStacks.HomeStack, { screen: Screens.Home })
                }}
                icon="arrow-left"
              />
            ),
          })}
        />
        <Stack.Screen name={Bifoldstacks.ConnectStack} component={ConnectStack} />
        <Stack.Screen
          name={Bifoldstacks.SettingStack}
          component={SettingStack}
          options={{
            cardStyleInterpolator: forFade,
          }}
        />
        <Stack.Screen name={Bifoldstacks.ContactStack} component={ContactStack} />
        <Stack.Screen name={Bifoldstacks.NotificationStack} component={NotificationStack} />
        <Stack.Screen
          name={Bifoldstacks.ConnectionStack}
          component={DeliveryStack}
          options={{
            gestureEnabled: false,
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name={Bifoldstacks.ProofRequestsStack} component={ProofRequestStack} />
        <Stack.Screen
          name={Bifoldstacks.HistoryStack}
          component={HistoryStack}
          options={{
            cardStyleInterpolator: forFade,
          }}
        />
        <Stack.Screen name={Stacks.HelpCenterStack} component={HelpCenterStack} />
      </Stack.Navigator>
    )
  }

  if (
    ((store.onboarding.onboardingVersion !== 0 && store.onboarding.didCompleteOnboarding) ||
      (store.onboarding.onboardingVersion === 0 && store.onboarding.didConsiderBiometry)) &&
    store.authentication.didAuthenticate &&
    store.onboarding.postAuthScreens.length === 0
  ) {
    return mainStack()
  }
  return <OnboardingStack />
}

export default RootStack
