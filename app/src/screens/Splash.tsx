import {
  Stacks,
  useTheme,
  useStore,
  InfoBox,
  InfoBoxType,
  testIdWithKey,
  TOKENS,
  useServices,
  BifoldError,
} from '@hyperledger/aries-bifold-core'
import { RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import { CommonActions, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, Image, useWindowDimensions, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import ProgressBar from '../components/ProgressBar'
import TipCarousel from '../components/TipCarousel'
import useInitializeBCAgent from '../hooks/initialize-agent'
import { BCState } from '../store'

enum InitErrorTypes {
  Onboarding,
  Agent,
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
  const [initError, setInitError] = useState<BifoldError | null>(null)
  const [reported, setReported] = useState(false)
  const initializing = useRef(false)
  const { initializeAgent } = useInitializeBCAgent()
  const [logger, ocaBundleResolver, { showPreface, enablePushNotifications }] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.UTIL_OCA_RESOLVER,
    TOKENS.CONFIG,
  ])
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const report = useCallback(() => {
    if (initError) {
      logger.report(initError)
    }

    setReported(true)
  }, [logger, initError])

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

  useEffect(() => {
    setStep(1)
    setStep(2)

    const initAgentAsyncEffect = async (): Promise<void> => {
      try {
        setStep(3)
        await (ocaBundleResolver as RemoteOCABundleResolver).checkForUpdates?.()

        setStep(4)
        const agent = await initializeAgent()

        if (!agent) {
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
        setInitErrorType(InitErrorTypes.Agent)
        setInitError(new BifoldError(t('Error.Title2031'), t('Error.Message2031'), (e as Error)?.message, 2031))
      }
    }

    initAgentAsyncEffect()
  }, [
    initializeAgent,
    mounted,
    setStep,
    ocaBundleResolver,
    store.stateLoaded,
    store.authentication.didAuthenticate,
    store.onboarding.postAuthScreens.length,
    store.onboarding.didConsiderBiometry,
    navigation,
    initAgentCount,
    t,
    onboardingComplete,
  ])

  const handleErrorCallToActionPressed = () => {
    setInitError(null)
    if (initErrorType === InitErrorTypes.Agent) {
      setInitAgentCount(initAgentCount + 1)
    } else {
      setInitOnboardingCount(initOnboardingCount + 1)
    }
  }

  const secondaryCallToActionIcon = useMemo(
    () =>
      reported ? (
        <Icon style={{ marginRight: 8 }} name={'check-circle'} size={18} color={ColorPallet.semantic.success} />
      ) : undefined,
    [reported, ColorPallet.semantic.success]
  )

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
                secondaryCallToActionTitle={reported ? t('Error.Reported') : t('Error.ReportThisProblem')}
                secondaryCallToActionDisabled={reported}
                secondaryCallToActionIcon={secondaryCallToActionIcon}
                secondaryCallToActionPressed={initError ? report : undefined}
                showVersionFooter
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
