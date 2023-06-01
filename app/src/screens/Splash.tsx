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
import Bugsnag from '@bugsnag/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/core'
import { CommonActions } from '@react-navigation/native'
import {
  LocalStorageKeys,
  DispatchAction,
  Screens,
  Stacks,
  OnboardingState,
  LoginAttemptState,
  PreferencesState,
  ToursState,
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
import { StyleSheet, View, Text, Image } from 'react-native'
import { Config } from 'react-native-config'
import { SafeAreaView } from 'react-native-safe-area-context'

import ProgressBar from '../components/ProgressBar'
import TipCarousel from '../components/TipCarousel'
import { BCDispatchAction, BCLocalStorageKeys } from '../store'

enum InitErrorTypes {
  Onboarding,
  Agent,
}

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
  const { setAgent } = useAgent()
  const { t } = useTranslation()
  const [store, dispatch] = useStore()
  const navigation = useNavigation()
  const { getWalletCredentials } = useAuth()
  const { ColorPallet } = useTheme()
  const { indyLedgers } = useConfiguration()
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [progressPercent, setProgressPercent] = useState(0)
  const [initOnboardingCount, setInitOnboardingCount] = useState(0)
  const [initAgentCount, setInitAgentCount] = useState(0)
  const [initErrorType, setInitErrorType] = useState<InitErrorTypes>(InitErrorTypes.Onboarding)
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
      width: '100%',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: ColorPallet.brand.secondaryBackground,
    },
    img: {
      width: '51.5%',
      resizeMode: 'contain',
    },
    progressContainer: {
      flex: 2,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '60%',
      minHeight: 37,
    },
    stepTextContainer: {
      marginTop: 10,
      justifyContent: 'center',
      alignItems: 'center',
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
      flex: 1,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      marginBottom: '10%',
    },
  })

  const loadObjectFromStorage = async (key: string): Promise<undefined | any> => {
    try {
      const data = await AsyncStorage.getItem(key)
      if (data) {
        return JSON.parse(data)
      }
    } catch (e: unknown) {
      Bugsnag.notify(e as Error)
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
    const dismissed = await loadObjectFromStorage(BCLocalStorageKeys.PersonCredentialOfferDismissed)
    if (dismissed) {
      dispatch({
        type: BCDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED,
        payload: [{ personCredentialOfferDismissed: dismissed.personCredentialOfferDismissed }],
      })
    }
  }

  const loadIASEnvironment = async (): Promise<void> => {
    const environment = await loadObjectFromStorage(BCLocalStorageKeys.Environment)
    if (environment) {
      dispatch({
        type: BCDispatchAction.UPDATE_ENVIRONMENT,
        payload: [environment],
      })
    }
  }

  useEffect(() => {
    const initOnboarding = async (): Promise<void> => {
      try {
        setStep(0)
        if (store.authentication.didAuthenticate) {
          return
        }

        setStep(1)
        // load authentication attempts from storage
        const attemptData = await loadAuthAttempts()

        // load BCID person credential notification dismissed state from storage
        await loadPersonNotificationDismissed()

        await loadIASEnvironment()

        setStep(2)
        const preferencesData = await AsyncStorage.getItem(LocalStorageKeys.Preferences)

        if (preferencesData) {
          const dataAsJSON = JSON.parse(preferencesData) as PreferencesState

          dispatch({
            type: DispatchAction.PREFERENCES_UPDATED,
            payload: [dataAsJSON],
          })
        }

        const toursData = await AsyncStorage.getItem(LocalStorageKeys.Tours)
        if (toursData) {
          const dataAsJSON = JSON.parse(toursData) as ToursState

          dispatch({
            type: DispatchAction.TOUR_DATA_UPDATED,
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
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: Screens.EnterPIN }],
              })
            )
            return
          } else if (onboardingComplete(dataAsJSON) && attemptData?.lockoutDate) {
            // return to lockout screen if lockout date is set
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: Screens.AttemptLockout }],
              })
            )
            return
          }

          // If onboarding was interrupted we need to pickup from where we left off.
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: resumeOnboardingAt(dataAsJSON) }],
            })
          )

          return
        }

        // We have no onboarding state, starting from step zero.
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: Screens.Onboarding }],
          })
        )
      } catch (e: unknown) {
        Bugsnag.notify(e as Error)
        setInitErrorType(InitErrorTypes.Onboarding)
        setInitError(e as Error)
      }
    }
    initOnboarding()
  }, [store.authentication.didAuthenticate, initOnboardingCount])

  useEffect(() => {
    const initAgent = async (): Promise<void> => {
      try {
        if (!store.authentication.didAuthenticate || !store.onboarding.didConsiderBiometry) {
          return
        }

        setStep(4)
        const credentials = await getWalletCredentials()

        if (!credentials?.id || !credentials.key) {
          // Cannot find wallet id/secret
          return
        }

        setStep(5)
        const options = {
          config: {
            label: 'QC Wallet',
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
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: Stacks.TabStack }],
          })
        )
      } catch (e: unknown) {
        Bugsnag.notify(e as Error)
        setInitErrorType(InitErrorTypes.Agent)
        setInitError(e as Error)
      }
    }

    initAgent()
  }, [store.authentication.didAuthenticate, store.onboarding.didConsiderBiometry, initAgentCount])

  const handleErrorCallToActionPressed = () => {
    setInitError(null)
    if (initErrorType === InitErrorTypes.Agent) {
      setInitAgentCount(initAgentCount + 1)
    } else {
      setInitOnboardingCount(initOnboardingCount + 1)
    }
  }

  return (
    <SafeAreaView style={styles.splashContainer}>
      <View style={{ flex: 2, width: '100%' }}>
        {initError ? (
          <View style={styles.errorBoxContainer}>
            <InfoBox
              notificationType={InfoBoxType.Error}
              title={t('Error.Title2026')}
              description={t('Error.Message2026')}
              message={initError?.message || t('Error.Unknown')}
              onCallToActionLabel={t('Init.Retry')}
              onCallToActionPressed={handleErrorCallToActionPressed}
            />
          </View>
        ) : (
          <TipCarousel />
        )}
      </View>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/img/Quebec.png')} style={styles.img} />
      </View>
      <View style={styles.progressContainer} testID={testIdWithKey('LoadingActivityIndicator')}>
        <View style={{ flex: 1, width: '100%', alignContent: 'center' }}>
          <View>
            <ProgressBar progressPercent={progressPercent} />
          </View>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepText}>{stepText}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default Splash
