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
  DispatchAction,
  Screens,
  Stacks,
  OnboardingState,
  LoginAttemptState,
  PreferencesState,
  useAuth,
  useTheme,
  useStore,
  useConfiguration,
  InfoBox,
  InfoBoxType,
  testIdWithKey,
} from 'aries-bifold'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, Image, useWindowDimensions } from 'react-native'
import { Config } from 'react-native-config'
import { SafeAreaView } from 'react-native-safe-area-context'

import ProgressBar from '../components/ProgressBar'
import TipCarousel from '../components/TipCarousel'
import { BCDispatchAction } from '../store'

const onboardingComplete = (state: OnboardingState): boolean => {
  return state.didCompleteTutorial && state.didAgreeToTerms && state.didCreatePIN && state.didConsiderBiometry
}

const resumeOnboardingAt = (state: OnboardingState): Screens => {
  if (state.didCompleteTutorial && state.didAgreeToTerms && state.didCreatePIN && !state.didConsiderBiometry) {
    return Screens.UseBiometry
  }

  if (state.didCompleteTutorial && state.didAgreeToTerms && !state.didCreatePIN) {
    return Screens.CreatePIN
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
  const { width } = useWindowDimensions()
  const { setAgent } = useAgent()
  const { t } = useTranslation()
  const [store, dispatch] = useStore()
  const navigation = useNavigation()
  const { getWalletCredentials } = useAuth()
  const { ColorPallet, Assets } = useTheme()
  const { indyLedgers } = useConfiguration()
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [progressPercent, setProgressPercent] = useState(0)
  const [initError, setInitError] = useState<Error | null>(null)
  const steps: string[] = [
    t('Init.Starting'),
    t('Init.CheckingAuth'),
    t('Init.FetchingPreferences'),
    t('Init.VerifyingOnboarding'),
    t('Init.GettingCredentials'),
    t('Init.RegisteringTransports'),
    t('Init.InitializingAgent'),
    t('Init.ConnectingLedgers'),
    t('Init.SettingAgent'),
    t('Init.Finishing'),
  ]

  const setStep = (stepIdx: number) => {
    setStepText(steps[stepIdx])
    const percent = Math.floor(((stepIdx + 1) / steps.length) * 100)
    setProgressPercent(percent)
  }

  const styles = StyleSheet.create({
    splashContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: ColorPallet.brand.primary,
    },
    progressContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      minHeight: 37,
    },
    stepTextContainer: {
      marginTop: 10,
    },
    stepText: {
      fontFamily: 'BCSans-Regular',
      fontSize: 16,
      color: '#a8abae',
    },
    errorBoxContainer: {
      paddingHorizontal: 20,
    },
    logoContainer: {
      alignSelf: 'center',
      marginBottom: '10%',
    },
  })

  const loadObjectFromStorage = async (key: string): Promise<undefined | any> => {
    try {
      const data = await AsyncStorage.getItem(key)
      if (data) {
        return JSON.parse(data)
      }
    } catch {
      return
    }
  }

  const loadAuthAttempts = async (): Promise<LoginAttemptState | undefined> => {
    const attemptsData = await AsyncStorage.getItem(LocalStorageKeys.LoginAttempts)
    if (attemptsData) {
      const attempts = JSON.parse(attemptsData) as LoginAttemptState
      dispatch({
        type: DispatchAction.ATTEMPT_UPDATED,
        payload: [attempts],
      })
      return attempts
    }
  }

  const loadPersonNotificationDismissed = async (): Promise<void> => {
    const dismissed = await loadObjectFromStorage('PersonCredentialOfferDismissed')
    if (dismissed) {
      dispatch({
        type: BCDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED,
        payload: [{ personCredentialOfferDismissed: dismissed.personCredentialOfferDismissed }],
      })
    }
  }

  useEffect(() => {
    if (store.authentication.didAuthenticate) {
      return
    }

    const initOnboarding = async (): Promise<void> => {
      try {
        setStep(1)
        // load authentication attempts from storage
        const attemptData = await loadAuthAttempts()

        // load BCID person credential notification dismissed state from storage
        await loadPersonNotificationDismissed()

        setStep(2)
        const preferencesData = await AsyncStorage.getItem(LocalStorageKeys.Preferences)

        if (preferencesData) {
          const dataAsJSON = JSON.parse(preferencesData) as PreferencesState

          dispatch({
            type: DispatchAction.PREFERENCES_UPDATED,
            payload: [dataAsJSON],
          })
        }

        setStep(3)
        const data = await AsyncStorage.getItem(LocalStorageKeys.Onboarding)
        if (data) {
          const dataAsJSON = JSON.parse(data) as OnboardingState
          dispatch({
            type: DispatchAction.ONBOARDING_UPDATED,
            payload: [dataAsJSON],
          })

          if (onboardingComplete(dataAsJSON) && !attemptData?.lockoutDate) {
            navigation.navigate(Screens.EnterPIN as never)
            return
          } else if (onboardingComplete(dataAsJSON) && attemptData?.lockoutDate) {
            // return to lockout screen if lockout date is set
            navigation.navigate(Screens.AttemptLockout as never)
            return
          }

          // If onboarding was interrupted we need to pickup from where we left off.
          navigation.navigate(resumeOnboardingAt(dataAsJSON) as never)

          return
        }

        // We have no onboarding state, starting from step zero.
        navigation.navigate(Screens.Onboarding as never)
      } catch (e: unknown) {
        setInitError(e as Error)
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
        setStep(4)
        const credentials = await getWalletCredentials()

        if (!credentials?.id || !credentials.key) {
          // Cannot find wallet id/secret
          return
        }

        setStep(5)
        const options = {
          config: {
            label: 'BC Wallet',
            mediatorConnectionsInvite: Config.MEDIATOR_URL,
            mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
            walletConfig: { id: credentials.id, key: credentials.key },
            autoAcceptConnections: true,
            autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
            logger: new ConsoleLogger(LogLevel.trace),
            indyLedgers,
            connectToIndyLedgersOnStartup: false,
            autoUpdateStorageOnStartup: true,
          },
          dependencies: agentDependencies,
        }

        const newAgent = new Agent(options)
        const wsTransport = new WsOutboundTransport()
        const httpTransport = new HttpOutboundTransport()

        newAgent.registerOutboundTransport(wsTransport)
        newAgent.registerOutboundTransport(httpTransport)

        setStep(6)
        await newAgent.initialize()

        setStep(7)
        await newAgent.ledger.connectToPools()

        setStep(8)
        setAgent(newAgent)

        setStep(9)
        navigation.navigate(Stacks.TabStack as never)
      } catch (e: unknown) {
        setInitError(e as Error)
      }
    }

    initAgent()
  }, [store.authentication.didAuthenticate, store.onboarding.didConsiderBiometry])

  return (
    <SafeAreaView style={styles.splashContainer}>
      <View style={styles.progressContainer} testID={testIdWithKey('LoadingActivityIndicator')}>
        <ProgressBar progressPercent={progressPercent} />
        <View style={styles.stepTextContainer}>
          <Text style={styles.stepText}>{stepText}</Text>
        </View>
      </View>
      <View style={{ width, minHeight: '40%' }}>
        {initError ? (
          <View style={styles.errorBoxContainer}>
            <InfoBox
              notificationType={InfoBoxType.Error}
              title={t('Error.Title2026')}
              description={t('Error.Message2026')}
              message={initError?.message || t('Error.Unknown')}
              onCallToActionPressed={() => setInitError(null)}
            />
          </View>
        ) : (
          <TipCarousel />
        )}
      </View>
      <View style={styles.logoContainer}>
        <Image
          source={Assets.img.logoPrimary.src}
          style={{ width: Assets.img.logoPrimary.width, height: Assets.img.logoPrimary.height }}
          testID={testIdWithKey('LoadingActivityIndicatorImage')}
        />
      </View>
    </SafeAreaView>
  )
}

export default Splash
