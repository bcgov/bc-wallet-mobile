import { Agent, HttpOutboundTransport, MediatorPickupStrategy, WsOutboundTransport } from '@aries-framework/core'
import { IndyVdrPoolConfig, IndyVdrPoolService } from '@aries-framework/indy-vdr/build/pool'
import { useAgent } from '@aries-framework/react-hooks'
import { agentDependencies } from '@aries-framework/react-native'
import { DrpcModule } from '@credo-ts/drpc'
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
  useAnimatedComponents,
} from '@hyperledger/aries-bifold-core'
// import { RemoteLogger, RemoteLoggerOptions } from '@hyperledger/aries-bifold-remote-logs'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CommonActions, useNavigation } from '@react-navigation/native'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, Image, useWindowDimensions, ScrollView } from 'react-native'
import { Config } from 'react-native-config'
// import {
//   getVersion,
//   getBuildNumber,
//   getApplicationName,
//   getSystemName,
//   getSystemVersion,
// } from 'react-native-device-info'
import { SafeAreaView } from 'react-native-safe-area-context'

// import ProgressBar from '../components/ProgressBar'
// import TipCarousel from '../components/TipCarousel'
// import { autoDisableRemoteLoggingIntervalInMinutes } from '../constants'
import { activate } from '../helpers/PushNotificationsHelper'
import { useAttestation } from '../services/attestation'
import { AppConsoleLogger, LogLevel, RemoteLogLevel } from '../services/logger'
import { BCState, BCLocalStorageKeys } from '../store'

import { TermsVersion } from './Terms'

enum InitErrorTypes {
  Onboarding,
  Agent,
}

const onboardingComplete = (
  state: OnboardingState,
  params: { termsVersion?: boolean | string; enablePushNotifications?: boolean }
): boolean => {
  const termsVer = params.termsVersion ?? true
  return (
    state.didCompleteTutorial &&
    state.didAgreeToTerms === termsVer &&
    state.didCreatePIN &&
    state.didConsiderBiometry &&
    (state.didConsiderPushNotifications || !params.enablePushNotifications)
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
    state.didCreatePIN &&
    params.enablePushNotifications &&
    !state.didConsiderPushNotifications
  ) {
    return Screens.UsePushNotifications
  }

  if (
    (state.didSeePreface || !params.showPreface) &&
    state.didCompleteTutorial &&
    state.didAgreeToTerms === termsVer &&
    !state.didCreatePIN
  ) {
    return Screens.CreatePIN
  }

  if ((state.didSeePreface || !params.showPreface) && state.didCompleteTutorial && state.didAgreeToTerms !== termsVer) {
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
  const { LoadingIndicator } = useAnimatedComponents()
  const { indyLedgers, showPreface, enablePushNotifications } = useConfiguration()
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [progressPercent, setProgressPercent] = useState(0)
  const [initOnboardingCount, setInitOnboardingCount] = useState(0)
  const [initAgentCount, setInitAgentCount] = useState(0)
  const [initErrorType, setInitErrorType] = useState<InitErrorTypes>(InitErrorTypes.Onboarding)
  const [initError, setInitError] = useState<Error | null>(null)
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
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
  })

  useEffect(() => {
    if (!agent) {
      return
    }

    startAttestationListeners()
  }, [agent])

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
      if (store.authentication.didAuthenticate || !store.stateLoaded) {
        if (!store.stateLoaded) {
          setStep(1)
        }
        return
      }

      setStep(2)

      if (
        onboardingComplete(store.onboarding, {
          enablePushNotifications: !!enablePushNotifications,
          termsVersion: TermsVersion,
        })
      ) {
        // if they previously completed onboarding before wallet naming was enabled, mark complete
        if (!store.onboarding.didNameWallet) {
          dispatch({ type: DispatchAction.DID_NAME_WALLET, payload: [true] })
        }

        // if they previously completed onboarding before preface was enabled, mark seen
        if (!store.onboarding.didSeePreface) {
          dispatch({ type: DispatchAction.DID_SEE_PREFACE })
        }

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
  }, [store.authentication.didAuthenticate, initOnboardingCount, store.stateLoaded])

  useEffect(() => {
    const initAgent = async (): Promise<void> => {
      try {
        if (!store.authentication.didAuthenticate || !store.onboarding.didConsiderBiometry) {
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

        // const logOptions: RemoteLoggerOptions = {
        //   lokiUrl: Config.REMOTE_LOGGING_URL,
        //   lokiLabels: {
        //     application: getApplicationName().toLowerCase(),
        //     job: 'react-native-logs',
        //     version: `${getVersion()}-${getBuildNumber()}`,
        //     system: `${getSystemName()} v${getSystemVersion()}`,
        //   },
        //   autoDisableRemoteLoggingIntervalInMinutes,
        // }
        // const logger = new RemoteLogger(logOptions)
        // logger.startEventListeners()

        const options = {
          config: {
            label: store.preferences.walletName || 'Instnt Wallet',
            walletConfig: {
              id: credentials.id,
              key: credentials.key,
            },
            logger: new AppConsoleLogger(LogLevel.debug, RemoteLogLevel.enable, credentials),
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
          const raw_transactions = await poolService.getPoolTransactions()
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore:next-line
          const transactions = raw_transactions.map(({ config, transactions }) => ({
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
  }, [store.authentication.didAuthenticate, store.onboarding.didConsiderBiometry, initAgentCount])

  return (
    <SafeAreaView style={styles.container}>
      <LoadingIndicator />
    </SafeAreaView>
  )
}

export default Splash
