import { Agent, HttpOutboundTransport, MediatorPickupStrategy, WsOutboundTransport } from '@credo-ts/core'
import { DrpcModule } from '@credo-ts/drpc'
import { IndyVdrPoolConfig, IndyVdrPoolService } from '@credo-ts/indy-vdr/build/pool'
import { useAgent } from '@credo-ts/react-hooks'
import { agentDependencies } from '@credo-ts/react-native'
import {
  DispatchAction,
  Screens,
  Stacks,
  OnboardingState,
  useAuth,
  useTheme,
  useStore,
  useConfiguration,
  InfoBox,
  InfoBoxType,
  testIdWithKey,
  didMigrateToAskar,
  migrateToAskar,
  getAgentModules,
  createLinkSecretIfRequired,
  TOKENS,
  useContainer,
} from '@hyperledger/aries-bifold-core'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CommonActions, useNavigation } from '@react-navigation/native'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, Image, useWindowDimensions, ScrollView } from 'react-native'
import { Config } from 'react-native-config'
import { SafeAreaView } from 'react-native-safe-area-context'

import ProgressBar from '../components/ProgressBar'
import TipCarousel from '../components/TipCarousel'
import { activate } from '../helpers/PushNotificationsHelper'
import { useAttestation } from '../services/attestation'
import { BCState, BCLocalStorageKeys } from '../store'

import { TermsVersion } from './Terms'

const OnboardingVersion = 2

enum InitErrorTypes {
  Onboarding,
  Agent,
}

const onboardingComplete = (state: OnboardingState): boolean => {
  return (
    (state.onboardingVersion !== 0 && state.didCompleteOnboarding) ||
    (state.onboardingVersion === 0 && state.didConsiderBiometry)
  )
}

const resumeOnboardingAt = (
  state: OnboardingState,
  params: {
    termsVersion?: boolean | string
    enableWalletNaming?: boolean
    enablePushNotifications?: boolean
    showPreface?: boolean
  }
): Screens => {
  const termsVer = params.termsVersion ?? true
  if (
    (state.didSeePreface || !params.showPreface) &&
    state.didCompleteTutorial &&
    state.didAgreeToTerms === termsVer &&
    state.didCreatePIN &&
    (state.didConsiderPushNotifications || !params.enablePushNotifications) &&
    (state.didNameWallet || !params.enableWalletNaming) &&
    !state.didConsiderBiometry
  ) {
    return Screens.UseBiometry
  }

  if (
    (state.didSeePreface || !params.showPreface) &&
    state.didCompleteTutorial &&
    state.didAgreeToTerms === termsVer &&
    state.didCreatePIN &&
    (state.didConsiderPushNotifications || !params.enablePushNotifications) &&
    params.enableWalletNaming &&
    !state.didNameWallet
  ) {
    return Screens.NameWallet
  }

  if (
    (state.didSeePreface || !params.showPreface) &&
    state.didCompleteTutorial &&
    state.didAgreeToTerms === termsVer &&
    !state.didCreatePIN
  ) {
    return Screens.CreatePIN
  }

  if ((state.didSeePreface || !params.showPreface) && state.didCompleteTutorial && !state.didAgreeToTerms) {
    return Screens.Terms
  }

  if (state.didSeePreface || !params.showPreface) {
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
  const { agent, setAgent } = useAgent()
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation()
  const { getWalletCredentials } = useAuth()
  const { ColorPallet, Assets } = useTheme()
  const { indyLedgers, showPreface, enablePushNotifications } = useConfiguration()
  const [mounted, setMounted] = useState(false)
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [progressPercent, setProgressPercent] = useState(0)
  const [initOnboardingCount, setInitOnboardingCount] = useState(0)
  const [initAgentCount, setInitAgentCount] = useState(0)
  const [initErrorType, setInitErrorType] = useState<InitErrorTypes>(InitErrorTypes.Onboarding)
  const [initError, setInitError] = useState<Error | null>(null)
  const container = useContainer()
  const logger = container.resolve(TOKENS.UTIL_LOGGER)

  const steps: string[] = [
    t('Init.Starting'),
    t('Init.FetchingPreferences'),
    t('Init.VerifyingOnboarding'),
    t('Init.GettingCredentials'),
    t('Init.RegisteringTransports'),
    t('Init.InitializingAgent'),
    t('Init.ConnectingLedgers'),
    t('Init.SettingAgent'),
    t('Init.Finishing'),
  ]
  const { start: startAttestationListeners } = useAttestation()

  const setStep = (stepIdx: number) => {
    setStepText(steps[stepIdx])
    const percent = Math.floor(((stepIdx + 1) / steps.length) * 100)
    setProgressPercent(percent)
  }

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
    if (!agent || !store.authentication.didAuthenticate) {
      return
    }

    startAttestationListeners()
  }, [agent, store.authentication.didAuthenticate])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const loadCachedLedgers = async (): Promise<IndyVdrPoolConfig[] | undefined> => {
    const cachedTransactions = await loadObjectFromStorage(BCLocalStorageKeys.GenesisTransactions)
    if (cachedTransactions) {
      const { timestamp, transactions } = cachedTransactions
      return moment().diff(moment(timestamp), 'days') >= 1 ? undefined : transactions
    }
  }

  useEffect(() => {
    try {
      setStep(0)
      if (!mounted || store.authentication.didAuthenticate || !store.stateLoaded) {
        if (!store.stateLoaded) {
          setStep(1)
        }
        return
      }

      setStep(2)

      if (store.onboarding.onboardingVersion !== OnboardingVersion) {
        dispatch({ type: DispatchAction.ONBOARDING_VERSION, payload: [OnboardingVersion] })
      }
      if (onboardingComplete(store.onboarding)) {
        if (!store.onboarding.didCompleteOnboarding) {
          dispatch({ type: DispatchAction.DID_COMPLETE_ONBOARDING })
        }
        // if they previously completed onboarding before wallet naming was enabled, mark complete
        if (!store.onboarding.didNameWallet) {
          dispatch({ type: DispatchAction.DID_NAME_WALLET, payload: [true] })
        }

        // if they previously completed onboarding before preface was enabled, mark seen
        if (!store.onboarding.didSeePreface) {
          dispatch({ type: DispatchAction.DID_SEE_PREFACE })
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

        return
      }

      // If onboarding was interrupted we need to pickup from where we left off.
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: resumeOnboardingAt(store.onboarding, {
                enableWalletNaming: store.preferences.enableWalletNaming,
                enablePushNotifications: !!enablePushNotifications,
                showPreface,
                termsVersion: TermsVersion,
              }),
            },
          ],
        })
      )

      return
    } catch (e: unknown) {
      setInitErrorType(InitErrorTypes.Onboarding)
      setInitError(e as Error)
    }
  }, [mounted, store.authentication.didAuthenticate, initOnboardingCount, store.stateLoaded])

  useEffect(() => {
    const initAgent = async (): Promise<void> => {
      try {
        if (
          !mounted ||
          !store.authentication.didAuthenticate ||
          !store.onboarding.didConsiderBiometry ||
          store.onboarding.postAuthScreens.length > 0
        ) {
          return
        }
        setStep(3)
        const credentials = await getWalletCredentials()

        if (!credentials?.id || !credentials.key) {
          // Cannot find wallet id/secret
          return
        }

        setStep(4)
        const cachedLedgers = await loadCachedLedgers()
        const ledgers = cachedLedgers ?? indyLedgers

        const options = {
          config: {
            label: store.preferences.walletName || 'BC Wallet',
            walletConfig: {
              id: credentials.id,
              key: credentials.key,
            },
            logger,
            mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
            autoUpdateStorageOnStartup: true,
            autoAcceptConnections: true,
          },
          dependencies: agentDependencies,
          modules: {
            ...getAgentModules({
              indyNetworks: ledgers,
              mediatorInvitationUrl: Config.MEDIATOR_URL,
            }),
            drpc: new DrpcModule(),
          },
        }

        const newAgent = new Agent(options)
        const wsTransport = new WsOutboundTransport()
        const httpTransport = new HttpOutboundTransport()

        newAgent.registerOutboundTransport(wsTransport)
        newAgent.registerOutboundTransport(httpTransport)

        // If we haven't migrated to Aries Askar yet, we need to do this before we initialize the agent.
        if (!didMigrateToAskar(store.migration)) {
          newAgent.config.logger.debug('Agent not updated to Aries Askar, updating...')

          await migrateToAskar(credentials.id, credentials.key, newAgent)

          newAgent.config.logger.debug('Successfully finished updating agent to Aries Askar')
          // Store that we migrated to askar.
          dispatch({
            type: DispatchAction.DID_MIGRATE_TO_ASKAR,
          })
        }

        setStep(5)
        await newAgent.initialize()
        const poolService = newAgent.dependencyManager.resolve(IndyVdrPoolService)
        if (!cachedLedgers) {
          // these escapes can be removed once Indy VDR has been upgraded and the patch is no longer needed
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore:next-line
          await poolService.refreshPoolConnections()
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore:next-line
          const raw_transactions = await poolService.getAllPoolTransactions()
          const transactions = raw_transactions
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore:next-line
            .map((item) => item.value)
            .map(({ config, transactions }) => ({
              ...config,
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore:next-line
              genesisTransactions: transactions.reduce((prev, curr) => {
                return prev + JSON.stringify(curr)
              }, ''),
            }))
          if (transactions) {
            await AsyncStorage.setItem(
              BCLocalStorageKeys.GenesisTransactions,
              JSON.stringify({ timestamp: moment().toISOString(), transactions })
            )
          }
        }

        setStep(6)
        await createLinkSecretIfRequired(newAgent)

        setStep(7)
        setAgent(newAgent)
        if (store.preferences.usePushNotifications) {
          activate(newAgent)
        }

        setStep(8)
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: Stacks.TabStack }],
          })
        )
      } catch (e: unknown) {
        setInitErrorType(InitErrorTypes.Agent)
        setInitError(e as Error)
      }
    }

    initAgent()
  }, [
    mounted,
    store.authentication.didAuthenticate,
    store.onboarding.postAuthScreens.length,
    store.onboarding.didConsiderBiometry,
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
