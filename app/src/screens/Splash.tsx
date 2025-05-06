import {
  useTheme,
  InfoBox,
  InfoBoxType,
  testIdWithKey,
  TOKENS,
  useServices,
  BifoldError,
  useStore,
  useAuth,
  SplashProps,
} from '@bifold/core'
import { RemoteOCABundleResolver } from '@bifold/oca/build/legacy'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, Image, useWindowDimensions, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import ProgressBar from '@components/ProgressBar'
import TipCarousel from '@components/TipCarousel'
import { BCState } from '@/store'

/*
  To customize this splash screen set the background color of the
  iOS and Android launch screen to match the background color of
  of this view.
*/
const Splash: React.FC<SplashProps> = ({ initializeAgent }) => {
  const { width } = useWindowDimensions()
  const { t } = useTranslation()
  const { walletSecret } = useAuth()
  const { ColorPallet, Assets } = useTheme()
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [store] = useStore<BCState>()
  const [progressPercent, setProgressPercent] = useState(0)
  const [initAgentCount, setInitAgentCount] = useState(0)
  const [initError, setInitError] = useState<BifoldError | null>(null)
  const [reported, setReported] = useState(false)
  const initializing = useRef(false)
  const [logger, ocaBundleResolver] = useServices([TOKENS.UTIL_LOGGER, TOKENS.UTIL_OCA_RESOLVER, TOKENS.CONFIG])
  const styles = StyleSheet.create({
    screenContainer: {
      backgroundColor: ColorPallet.brand.tertiaryBackground,
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

  useEffect(() => {
    setStep(1)
    if (initializing.current || !store.authentication.didAuthenticate) {
      return
    }

    if (!walletSecret) {
      setInitError(new BifoldError(t('Error.Title2031'), t('Error.Message2031'), 'Wallet secret is not found', 2031))
      return
    }

    const initAgentAsyncEffect = async (): Promise<void> => {
      try {
        initializing.current = true

        setStep(2)
        await (ocaBundleResolver as RemoteOCABundleResolver).checkForUpdates?.()

        setStep(3)
        await initializeAgent(walletSecret)

        setStep(4)
      } catch (e: unknown) {
        initializing.current = false

        setInitError(new BifoldError(t('Error.Title2031'), t('Error.Message2031'), (e as Error)?.message, 2031))
      }
    }

    initAgentAsyncEffect()
  }, [
    initializeAgent,
    setStep,
    ocaBundleResolver,
    initAgentCount,
    t,
    store.authentication.didAuthenticate,
    walletSecret,
  ])

  const handleErrorCallToActionPressed = useCallback(() => {
    setInitError(null)

    setInitAgentCount(initAgentCount + 1)
  }, [initAgentCount, setInitAgentCount])

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
          <ProgressBar progressPercent={progressPercent} dark />
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
