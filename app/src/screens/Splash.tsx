import {
  Agent,
  AutoAcceptCredential,
  ConsoleLogger,
  HttpOutboundTransport,
  LogLevel,
  MediatorPickupStrategy,
  WsOutboundTransport,
} from '@aries-framework/core'
import { useAgent } from '@aries-framework/react-hooks'
import { agentDependencies } from '@aries-framework/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/core'
import {
  LocalStorageKeys,
  StoreContext,
  DispatchAction,
  Screens,
  Stacks,
  OnboardingState,
  PreferencesState,
  PrivacyState,
  useAuth,
  useTheme,
  ToastType,
  indyLedgers,
  LoadingIndicator,
} from 'aries-bifold'
import React, { useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { Config } from 'react-native-config'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

interface SplashProps {
  setAgent: React.Dispatch<React.SetStateAction<Agent | undefined>>
}

const onboardingComplete = (state: OnboardingState): boolean => {
  return state.didCompleteTutorial && state.didAgreeToTerms && state.didCreatePIN && state.didConsiderBiometry
}

const resumeOnboardingAt = (state: OnboardingState): Screens => {
  if (state.didCompleteTutorial && state.didAgreeToTerms && state.didCreatePIN && !state.didConsiderBiometry) {
    return Screens.UseBiometry
  }

  if (state.didCompleteTutorial && state.didAgreeToTerms && !state.didCreatePIN) {
    return Screens.CreatePin
  }

  if (state.didCompleteTutorial && !state.didAgreeToTerms) {
    return Screens.Terms
  }

  return Screens.Onboarding
}
/*
  To customize this splash screen set the background color of the
  iOS and Android launch screen to match the background color of
  of this view.
*/
const Splash: React.FC = () => {
  const { setAgent } = useAgent()
  const { t } = useTranslation()
  const [store, dispatch] = useContext(StoreContext)
  const navigation = useNavigation()
  const { getWalletCredentials } = useAuth()
  const { ColorPallet } = useTheme()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: ColorPallet.brand.primary,
    },
  })

  useEffect(() => {
    if (store.authentication.didAuthenticate) {
      return
    }

    const initOnboarding = async (): Promise<void> => {
      try {
        const preferencesData = await AsyncStorage.getItem(LocalStorageKeys.Preferences)

        if (preferencesData) {
          const dataAsJSON = JSON.parse(preferencesData) as PreferencesState

          dispatch({
            type: DispatchAction.PREFERENCES_UPDATED,
            payload: [dataAsJSON],
          })
        }

        const privacyData = await AsyncStorage.getItem(LocalStorageKeys.Privacy)
        if (privacyData) {
          const dataAsJSON = JSON.parse(privacyData) as PrivacyState

          dispatch({
            type: DispatchAction.PRIVACY_UPDATED,
            payload: [dataAsJSON],
          })
        }

        const data = await AsyncStorage.getItem(LocalStorageKeys.Onboarding)
        if (data) {
          const dataAsJSON = JSON.parse(data) as OnboardingState
          dispatch({
            type: DispatchAction.ONBOARDING_UPDATED,
            payload: [dataAsJSON],
          })

          if (onboardingComplete(dataAsJSON)) {
            navigation.navigate(Screens.EnterPin as never)
            return
          }

          // If onboarding was interrupted we need to pickup from where we left off.
          navigation.navigate(resumeOnboardingAt(dataAsJSON) as never)

          return
        }

        // We have no onboarding state, starting from step zero.
        navigation.navigate(Screens.Onboarding as never)
      } catch (error) {
        // TODO:(jl)
      }
    }

    initOnboarding()
  }, [store.authentication.didAuthenticate])

  useEffect(() => {
    if (!store.authentication.didAuthenticate || !store.onboarding.didConsiderBiometry) {
      return
    }

    const initAgent = async (): Promise<void> => {
      try {
        const credentials = await getWalletCredentials()

        if (!credentials?.id || !credentials.key) {
          // Cannot find wallet id/secret
          return
        }

        const newAgent = new Agent(
          {
            label: 'Aries Bifold',
            mediatorConnectionsInvite: Config.MEDIATOR_URL,
            mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
            walletConfig: { id: credentials.id, key: credentials.key },
            autoAcceptConnections: true,
            autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
            logger: new ConsoleLogger(LogLevel.trace),
            indyLedgers,
            connectToIndyLedgersOnStartup: true,
            autoUpdateStorageOnStartup: true,
          },
          agentDependencies
        )

        const wsTransport = new WsOutboundTransport()
        const httpTransport = new HttpOutboundTransport()

        newAgent.registerOutboundTransport(wsTransport)
        newAgent.registerOutboundTransport(httpTransport)

        await newAgent.initialize()
        setAgent(newAgent)
        navigation.navigate(Stacks.TabStack as never)

        // TODO:
      } catch (e: unknown) {
        Toast.show({
          type: ToastType.Error,
          text1: t('Global.Failure'),
          text2: (e as Error)?.message || t('Error.Unknown'),
          visibilityTime: 2000,
          position: 'bottom',
        })
        return
      }
    }

    initAgent()
  }, [store.authentication.didAuthenticate, store.onboarding.didConsiderBiometry])

  return (
    <SafeAreaView style={styles.container}>
      <LoadingIndicator />
    </SafeAreaView>
  )
}

export default Splash
