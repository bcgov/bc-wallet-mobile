import {
  Agent,
  ConnectionsModule,
  DidsModule,
  HttpOutboundTransport,
  MediatorPickupStrategy,
  WsOutboundTransport,
} from '@credo-ts/core'
import { DrpcModule } from '@credo-ts/drpc'
import { IndyVdrPoolConfig, IndyVdrPoolService } from '@credo-ts/indy-vdr/build/pool'
import { useAgent } from '@credo-ts/react-hooks'
import { agentDependencies } from '@credo-ts/react-native'
import {
  DispatchAction,
  Screens,
  OnboardingState,
  useAuth,
  useTheme,
  useStore,
  InfoBox,
  InfoBoxType,
  testIdWithKey,
  didMigrateToAskar,
  migrateToAskar,
  getAgentModules,
  createLinkSecretIfRequired,
  TOKENS,
  useServices,
  Stacks,
} from '@hyperledger/aries-bifold-core'
import { RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import { GetCredentialDefinitionRequest, GetSchemaRequest } from '@hyperledger/indy-vdr-shared'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CommonActions, useNavigation } from '@react-navigation/native'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import { Config } from 'react-native-config'
import { SafeAreaView } from 'react-native-safe-area-context'

import LogoQuebecBlanc from '../assets/img/LogoQuebecBlanc.svg'
import Progress from '../components/Progress'
import TipCarousel from '../components/TipCarousel'
import { SplashSmallScreenWidthPercentage } from '../constants'
import { BCState, BCDispatchAction, BCLocalStorageKeys } from '../store'

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
  const { setAgent } = useAgent()
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation()
  const { walletSecret } = useAuth()
  const { ColorPallet } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [progressPercent, setProgressPercent] = useState(0)
  const [initOnboardingCount, setInitOnboardingCount] = useState(0)
  const [initAgentCount, setInitAgentCount] = useState(0)
  const [initErrorType, setInitErrorType] = useState<InitErrorTypes>(InitErrorTypes.Onboarding)
  const [initError, setInitError] = useState<Error | null>(null)
  const [opacity, setOpacity] = useState(0)
  const [allLedgers, ocaBundleResolver, credDefs, schemas] = useServices([
    TOKENS.UTIL_LEDGERS,
    TOKENS.UTIL_OCA_RESOLVER,
    TOKENS.CACHE_CRED_DEFS,
    TOKENS.CACHE_SCHEMAS,
  ])

  const { width } = useWindowDimensions()

  const steps: string[] = [
    t('Init.Starting'),
    t('Init.FetchingPreferences'),
    t('Init.VerifyingOnboarding'),
    t('Init.GettingCredentials'),
    t('Init.RegisteringTransports'),
    t('Init.InitializingAgent'),
    t('Init.CacheWarmup'),
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
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: ColorPallet.brand.primary,
    },
    img: {
      width: '100%',
      resizeMode: 'contain',
    },
    progressContainer: {
      flex: 1,
      opacity: opacity,
      paddingHorizontal: 40,
      width: '100%',
    },
    tipCarouselContainer: {
      flex: 1,
      width: width > 600 ? `${SplashSmallScreenWidthPercentage}%` : '100%',
      height: '100%',
      justifyContent: width > 600 ? 'flex-end' : 'center',
      opacity: opacity,
    },
    logoAndProgressContainer: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    innerLogoAndProgressContainer: {
      width: `${SplashSmallScreenWidthPercentage}%`,
      maxHeight: width > 600 ? 200 : 120,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressAndTextContainer: {
      width: '100%',
      paddingHorizontal: 40,
      alignContent: 'center',
    },
    stepTextContainer: {
      minHeight: 50,
    },
    stepText: {
      fontFamily: 'BCSans-Regular',
      fontSize: 16,
      color: '#ffffff',
    },
    errorBoxContainer: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
  })

  // navigation calls that occur before the screen is fully mounted will fail
  useEffect(() => {
    setMounted(true)
  }, [])

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

  const loadIASEnvironment = async (): Promise<string> => {
    const environment = await loadObjectFromStorage(BCLocalStorageKeys.Environment)
    if (environment) {
      dispatch({
        type: BCDispatchAction.UPDATE_ENVIRONMENT,
        payload: [environment],
      })
    }
    return environment?.iasAgentInviteUrl ?? Config.MEDIATOR_URL
  }

  const loadCachedLedgers = async (): Promise<IndyVdrPoolConfig[] | undefined> => {
    const cachedTransactions = await loadObjectFromStorage(BCLocalStorageKeys.GenesisTransactions)
    if (cachedTransactions) {
      const { timestamp, transactions } = cachedTransactions
      return moment().diff(moment(timestamp), 'days') >= 1 ? undefined : transactions
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOpacity(1)
    }, 1000)

    return () => clearTimeout(timeout)
  }, [])

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
          !walletSecret?.id ||
          !walletSecret.key ||
          store.onboarding.postAuthScreens.length > 0
        ) {
          return
        }

        const environment = await loadIASEnvironment()

        setStep(3)

        await (ocaBundleResolver as RemoteOCABundleResolver).checkForUpdates?.()

        setStep(4)
        const cachedLedgers = await loadCachedLedgers()
        const ledgers = cachedLedgers ?? allLedgers

        const modules = getAgentModules({
          indyNetworks: ledgers,
          mediatorInvitationUrl: environment,
        })

        modules.connections = new ConnectionsModule({
          autoAcceptConnections: true,
          peerNumAlgoForDidExchangeRequests: 4,
        })

        const options = {
          config: {
            label: store.preferences.walletName || 'Portefeuille QC',
            walletConfig: {
              id: walletSecret.id,
              key: walletSecret.key,
            },
            mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
            autoUpdateStorageOnStartup: true,
            autoAcceptConnections: true,
          },
          dependencies: agentDependencies,
          modules,
          drpc: new DrpcModule(),
          dids: new DidsModule(),
        }

        const newAgent = new Agent(options)
        const wsTransport = new WsOutboundTransport()
        const httpTransport = new HttpOutboundTransport()

        newAgent.registerOutboundTransport(wsTransport)
        newAgent.registerOutboundTransport(httpTransport)

        // If we haven't migrated to Aries Askar yet, we need to do this before we initialize the agent.
        if (!didMigrateToAskar(store.migration)) {
          newAgent.config.logger.debug('Agent not updated to Aries Askar, updating...')

          await migrateToAskar(walletSecret.id, walletSecret.key, newAgent)

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
            // @ts-ignore:next-line
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
        credDefs.forEach(async ({ did, id }) => {
          // @ts-ignore:next-line
          const pool = await poolService.getPoolForDid(newAgent.context, did)
          const credDefRequest = new GetCredentialDefinitionRequest({ credentialDefinitionId: id })
          await pool.pool.submitRequest(credDefRequest)
        })

        schemas.forEach(async ({ did, id }) => {
          // @ts-ignore:next-line
          const pool = await poolService.getPoolForDid(newAgent.context, did)
          const schemaRequest = new GetSchemaRequest({ schemaId: id })
          await pool.pool.submitRequest(schemaRequest)
        })

        setStep(7)
        await createLinkSecretIfRequired(newAgent)

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
    walletSecret,
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
    <SafeAreaView style={styles.splashContainer}>
      <View style={styles.errorBoxContainer}>
        {initError && (
          <InfoBox
            notificationType={InfoBoxType.Error}
            title={t('Error.Title2026')}
            description={t('Error.Message2026')}
            message={initError?.message || t('Error.Unknown')}
            onCallToActionLabel={t('Init.Retry')}
            onCallToActionPressed={handleErrorCallToActionPressed}
          />
        )}
      </View>
      <View style={styles.logoAndProgressContainer}>
        <View style={styles.innerLogoAndProgressContainer}>
          <View style={styles.logoContainer}>
            <LogoQuebecBlanc style={styles.img} width={'100%'} height={'100%'} />
          </View>
          <View style={styles.progressContainer} testID={testIdWithKey('LoadingActivityIndicator')}>
            <View style={styles.stepTextContainer}>
              <Progress progressPercent={progressPercent} progressText={stepText} textStyle={styles.stepText} />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.tipCarouselContainer}>
        <View>{<TipCarousel />}</View>
      </View>
    </SafeAreaView>
  )
}

export default Splash
