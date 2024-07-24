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
import { RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import { GetCredentialDefinitionRequest, GetSchemaRequest } from '@hyperledger/indy-vdr-shared'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CommonActions, useNavigation } from '@react-navigation/native'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, Image } from 'react-native'
import { Config } from 'react-native-config'
import { SafeAreaView } from 'react-native-safe-area-context'

import ledgers from '../../config/ledgers'
import ProgressBar from '../components/ProgressBar'
import TipCarousel from '../components/TipCarousel'
import { useAttestation } from '../hooks/useAttestation'
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
  const { agent, setAgent } = useAgent()
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation()
  const { getWalletCredentials } = useAuth()
  const { ColorPallet } = useTheme()
  const { showPreface } = useConfiguration()
  const [mounted, setMounted] = useState(false)
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [progressPercent, setProgressPercent] = useState(0)
  const [initOnboardingCount, setInitOnboardingCount] = useState(0)
  const [initAgentCount, setInitAgentCount] = useState(0)
  const [initErrorType, setInitErrorType] = useState<InitErrorTypes>(InitErrorTypes.Onboarding)
  const [initError, setInitError] = useState<Error | null>(null)
  const container = useContainer()
  const indyLedgers = container.resolve(TOKENS.UTIL_LEDGERS)
  const ocaBundleResolver = container.resolve(TOKENS.UTIL_OCA_RESOLVER) as RemoteOCABundleResolver

  const qcLedgers: IndyVdrPoolConfig[] = ledgers

  const allLedgers = [...qcLedgers, ...indyLedgers]

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
  const { start: startAttestationListeners } = useAttestation()

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

  const loadIASEnvironment = async (): Promise<string> => {
    const environment = await loadObjectFromStorage(BCLocalStorageKeys.Environment)
    if (environment) {
      dispatch({
        type: BCDispatchAction.UPDATE_ENVIRONMENT,
        payload: [environment],
      })
    }
    return environment?.iasAgentInviteUrl ?? Config.MCN_MEDIATOR_URL
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

        const environment = await loadIASEnvironment()

        setStep(3)

        await ocaBundleResolver.checkForUpdates()
        const credentials = await getWalletCredentials()

        if (!credentials?.id || !credentials.key) {
          // Cannot find wallet id/secret
          return
        }

        setStep(4)
        const cachedLedgers = await loadCachedLedgers()
        const ledgers = cachedLedgers ?? allLedgers

        const options = {
          config: {
            label: store.preferences.walletName || 'Portefeuille QC',
            walletConfig: {
              id: credentials.id,
              key: credentials.key,
            },
            mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
            autoUpdateStorageOnStartup: true,
            autoAcceptConnections: true,
          },
          dependencies: agentDependencies,
          modules: getAgentModules({
            indyNetworks: ledgers,
            mediatorInvitationUrl: environment,
          }),
          drpc: new DrpcModule(),
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
        const credDefs = container.resolve(TOKENS.CACHE_CRED_DEFS)
        const schemas = container.resolve(TOKENS.CACHE_SCHEMAS)

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
