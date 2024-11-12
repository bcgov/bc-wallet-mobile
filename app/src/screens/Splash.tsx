import {
  DispatchAction,
  Screens,
  Stacks,
  useTheme,
  useStore,
  InfoBox,
  InfoBoxType,
  testIdWithKey,
  TOKENS,
  useServices,
} from '@hyperledger/aries-bifold-core'
import { RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import { CommonActions, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, Image, useWindowDimensions, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ProgressBar from '../components/ProgressBar'
import TipCarousel from '../components/TipCarousel'
import useInitializeBCAgent from '../hooks/initialize-agent'
import { BCState } from '../store'

import { TermsVersion } from './Terms'

const OnboardingVersion = 2

enum InitErrorTypes {
  Onboarding,
  Agent,
}

const onboardingComplete = (
  onboardingVersion: number,
  didCompleteOnboarding: boolean,
  didConsiderBiometry: boolean
): boolean => {
  return (onboardingVersion !== 0 && didCompleteOnboarding) || (onboardingVersion === 0 && didConsiderBiometry)
}

const resumeOnboardingAt = (
  didSeePreface: boolean,
  didCompleteTutorial: boolean,
  didAgreeToTerms: boolean | string,
  didCreatePIN: boolean,
  didNameWallet: boolean,
  didConsiderBiometry: boolean,
  didConsiderPushNotifications?: boolean,
  termsVersion?: boolean | string,
  enableWalletNaming?: boolean,
  showPreface?: boolean,
  enablePushNotifications?: boolean
): Screens => {
  const termsVer = termsVersion ?? true

  if (
    (didSeePreface || !showPreface) &&
    didCompleteTutorial &&
    didAgreeToTerms === termsVer &&
    didCreatePIN &&
    (didConsiderPushNotifications || !enablePushNotifications) &&
    (didNameWallet || !enableWalletNaming) &&
    !didConsiderBiometry
  ) {
    return Screens.UseBiometry
  }

  if (
    (didSeePreface || !showPreface) &&
    didCompleteTutorial &&
    didAgreeToTerms === termsVer &&
    didCreatePIN &&
    (didConsiderPushNotifications || !enablePushNotifications) &&
    enableWalletNaming &&
    !didNameWallet
  ) {
    return Screens.NameWallet
  }

  if ((didSeePreface || !showPreface) && didCompleteTutorial && didAgreeToTerms === termsVer && !didCreatePIN) {
    return Screens.CreatePIN
  }

  if ((didSeePreface || !showPreface) && didCompleteTutorial && !didAgreeToTerms) {
    return Screens.Terms
  }

  if (didSeePreface || !showPreface) {
    return Screens.Onboarding
  }

  return Screens.Preface
}

/*
  To customize this splash screen set the background color of the
  iOS and Android launch screen to match the background color of
  of this view.
*/
const Splash = () => {
  const { width } = useWindowDimensions()
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation()
  const { ColorPallet, Assets } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [progressPercent, setProgressPercent] = useState(0)
  const [initOnboardingCount, setInitOnboardingCount] = useState(0)
  const [initAgentCount, setInitAgentCount] = useState(0)
  const [initErrorType, setInitErrorType] = useState<InitErrorTypes>(InitErrorTypes.Onboarding)
  const [initError, setInitError] = useState<Error | null>(null)
  const initializing = useRef(false)
  const { initializeAgent } = useInitializeBCAgent()
  const [ocaBundleResolver, { showPreface, enablePushNotifications }] = useServices([
    TOKENS.UTIL_OCA_RESOLVER,
    TOKENS.CONFIG,
  ])

  const steps: string[] = useMemo(
    () => [
      t('Init.Starting'),
      t('Init.FetchingPreferences'),
      t('Init.VerifyingOnboarding'),
      t('Init.CheckingOCA'),
      t('Init.InitializingAgent'),
      t('Init.Finishing'),
    ],
    [t]
  )

  const setStep = useCallback(
    (stepIdx: number) => {
      setStepText(steps[stepIdx])
      const percent = Math.floor(((stepIdx + 1) / steps.length) * 100)
      setProgressPercent(percent)
    },
    [steps]
  )

  const styles = StyleSheet.create({
    screenContainer: {
      backgroundColor: ColorPallet.brand.primary,
      flex: 1,
    },
    scrollContentContainer: {
      flexGrow: 1,
      justifyContent: 'space-between',
    },
    progressContainer: {
      alignItems: 'center',
      width: '100%',
    },
    stepTextContainer: {
      marginTop: 10,
    },
    stepText: {
      fontFamily: 'BCSans-Regular',
      fontSize: 16,
      color: '#a8abae',
    },
    carouselContainer: {
      width,
      marginVertical: 30,
      flex: 1,
    },
    errorBoxContainer: {
      paddingHorizontal: 20,
    },
    logoContainer: {
      alignSelf: 'center',
      marginBottom: 30,
    },
  })

  // navigation calls that occur before the screen is fully mounted will fail
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    try {
      if (!mounted || store.authentication.didAuthenticate || !store.stateLoaded) {
        if (!store.stateLoaded) {
          setStep(1)
        }
        return
      }

      setStep(2)

      if (store.onboarding.onboardingVersion !== OnboardingVersion) {
        dispatch({ type: DispatchAction.ONBOARDING_VERSION, payload: [OnboardingVersion] })
        return
      }

      if (
        !onboardingComplete(
          store.onboarding.onboardingVersion,
          store.onboarding.didCompleteOnboarding,
          store.onboarding.didConsiderBiometry
        )
      ) {
        // If onboarding was interrupted we need to pickup from where we left off.
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: resumeOnboardingAt(
                  store.onboarding.didSeePreface,
                  store.onboarding.didCompleteTutorial,
                  store.onboarding.didAgreeToTerms,
                  store.onboarding.didCreatePIN,
                  store.onboarding.didNameWallet,
                  store.onboarding.didConsiderBiometry,
                  store.onboarding.didConsiderPushNotifications,
                  TermsVersion,
                  store.preferences.enableWalletNaming,
                  showPreface,
                  !!enablePushNotifications
                ),
              },
            ],
          })
        )

        return
      }

      if (!store.onboarding.didCompleteOnboarding) {
        dispatch({ type: DispatchAction.DID_COMPLETE_ONBOARDING })
        return
      }

      // if they previously completed onboarding before wallet naming was enabled, mark complete
      if (!store.onboarding.didNameWallet) {
        dispatch({ type: DispatchAction.DID_NAME_WALLET, payload: [true] })
        return
      }

      // if they previously completed onboarding before preface was enabled, mark seen
      if (!store.onboarding.didSeePreface) {
        dispatch({ type: DispatchAction.DID_SEE_PREFACE })
        return
      }

      // add post authentication screens
      const postAuthScreens = []
      if (store.onboarding.didAgreeToTerms !== TermsVersion) {
        postAuthScreens.push(Screens.Terms)
      }
      if (!store.onboarding.didConsiderPushNotifications && enablePushNotifications) {
        postAuthScreens.push(Screens.UsePushNotifications)
      }
      dispatch({ type: DispatchAction.SET_POST_AUTH_SCREENS, payload: [postAuthScreens] })

      if (!store.loginAttempt.lockoutDate) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: Screens.EnterPIN }],
          })
        )
      } else {
        // return to lockout screen if lockout date is set
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: Screens.AttemptLockout }],
          })
        )
      }
    } catch (e: unknown) {
      setInitErrorType(InitErrorTypes.Onboarding)
      setInitError(e as Error)
    }
  }, [
    mounted,
    setStep,
    store.authentication.didAuthenticate,
    store.stateLoaded,
    store.onboarding.onboardingVersion,
    store.onboarding.didCompleteOnboarding,
    store.onboarding.didSeePreface,
    store.onboarding.didCompleteTutorial,
    store.onboarding.didAgreeToTerms,
    store.onboarding.didCreatePIN,
    store.onboarding.didConsiderPushNotifications,
    store.onboarding.didNameWallet,
    store.onboarding.didConsiderBiometry,
    store.preferences.enableWalletNaming,
    enablePushNotifications,
    showPreface,
    dispatch,
    store.loginAttempt.lockoutDate,
    navigation,
    initOnboardingCount,
    t,
  ])

  useEffect(() => {
    const initAgentAsyncEffect = async (): Promise<void> => {
      try {
        if (
          !mounted ||
          initializing.current ||
          !store.authentication.didAuthenticate ||
          !store.onboarding.didConsiderBiometry ||
          store.onboarding.postAuthScreens.length > 0
        ) {
          return
        }

        initializing.current = true

        setStep(3)
        await (ocaBundleResolver as RemoteOCABundleResolver).checkForUpdates?.()

        setStep(4)
        const newAgent = await initializeAgent()
        if (!newAgent) {
          initializing.current = false
          return
        }

        setStep(5)
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: Stacks.TabStack }],
          })
        )
      } catch (e: unknown) {
        initializing.current = false
        setInitErrorType(InitErrorTypes.Agent)
        setInitError(e as Error)
      }
    }

    initAgentAsyncEffect()
  }, [
    initializeAgent,
    mounted,
    setStep,
    ocaBundleResolver,
    store.authentication.didAuthenticate,
    store.onboarding.postAuthScreens.length,
    store.onboarding.didConsiderBiometry,
    navigation,
    initAgentCount,
  ])

  const handleErrorCallToActionPressed = () => {
    setInitError(null)
    if (initErrorType === InitErrorTypes.Agent) {
      setInitAgentCount(initAgentCount + 1)
    } else {
      setInitOnboardingCount(initOnboardingCount + 1)
    }
  }

  return (
    <SafeAreaView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.progressContainer} testID={testIdWithKey('LoadingActivityIndicator')}>
          <ProgressBar progressPercent={progressPercent} />
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepText}>{stepText}</Text>
          </View>
        </View>
        <View style={styles.carouselContainer}>
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
          <Image
            source={Assets.img.logoPrimary.src}
            style={{ width: Assets.img.logoPrimary.width, height: Assets.img.logoPrimary.height }}
            testID={testIdWithKey('LoadingActivityIndicatorImage')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Splash
