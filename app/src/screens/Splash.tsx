import { Agent, HttpOutboundTransport, MediatorPickupStrategy, WsOutboundTransport, WalletError } from '@credo-ts/core'
import { IndyVdrPoolConfig, IndyVdrPoolService } from '@credo-ts/indy-vdr/build/pool'
import { useAgent } from '@credo-ts/react-hooks'
import { agentDependencies } from '@credo-ts/react-native'
import {
  BifoldError,
  DispatchAction,
  Screens,
  Stacks,
  useAuth,
  useTheme,
  useStore,
  InfoBox,
  InfoBoxType,
  testIdWithKey,
  migrateToAskar,
  createLinkSecretIfRequired,
  TOKENS,
  useServices,
  PersistentStorage,
} from '@hyperledger/aries-bifold-core'
import { RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import { GetCredentialDefinitionRequest, GetSchemaRequest } from '@hyperledger/indy-vdr-shared'
import { CommonActions, useNavigation } from '@react-navigation/native'
import moment from 'moment'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, Image, useWindowDimensions, ScrollView } from 'react-native'
import { Config } from 'react-native-config'
import { CachesDirectoryPath } from 'react-native-fs'
import { SafeAreaView } from 'react-native-safe-area-context'

import ProgressBar from '../components/ProgressBar'
import TipCarousel from '../components/TipCarousel'
import { activate } from '../helpers/PushNotificationsHelper'
import { getBCAgentModules } from '../helpers/bc-agent-modules'
import { BCState, BCLocalStorageKeys } from '../store'

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

const loadCachedLedgers = async (): Promise<IndyVdrPoolConfig[] | undefined> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedTransactions = await PersistentStorage.fetchValueForKey<any>(BCLocalStorageKeys.GenesisTransactions)
  if (cachedTransactions) {
    const { timestamp, transactions } = cachedTransactions
    return moment().diff(moment(timestamp), 'days') >= 1 ? undefined : transactions
  }
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
  const { walletSecret } = useAuth()
  const { ColorPallet, Assets } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [stepText, setStepText] = useState<string>(t('Init.Starting'))
  const [progressPercent, setProgressPercent] = useState(0)
  const [initOnboardingCount, setInitOnboardingCount] = useState(0)
  const [initAgentCount, setInitAgentCount] = useState(0)
  const [initErrorType, setInitErrorType] = useState<InitErrorTypes>(InitErrorTypes.Onboarding)
  const [initError, setInitError] = useState<Error | null>(null)
  const [
    logger,
    indyLedgers,
    ocaBundleResolver,
    { showPreface, enablePushNotifications },
    attestationMonitor,
    credDefs,
    schemas,
  ] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.UTIL_LEDGERS,
    TOKENS.UTIL_OCA_RESOLVER,
    TOKENS.CONFIG,
    TOKENS.UTIL_ATTESTATION_MONITOR,
    TOKENS.CACHE_CRED_DEFS,
    TOKENS.CACHE_SCHEMAS,
  ])

  const steps: string[] = useMemo(
    () => [
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

        setStep(3)

        await (ocaBundleResolver as RemoteOCABundleResolver).checkForUpdates?.()

        if (agent) {
          logger.info('Agent already initialized, restarting...')

          try {
            await agent.wallet.open({
              id: walletSecret.id,
              key: walletSecret.key,
            })
          } catch (error) {
            // Credo does not use error codes but this will be in the
            // the error message if the wallet is already open
            const catchPhrase = 'instance already opened'

            if (error instanceof WalletError && error.message.includes(catchPhrase)) {
              logger.warn('Wallet already open, nothing to do')
            } else {
              logger.error('Error opening existing wallet:', error as Error)

              throw new BifoldError(
                'Wallet Service',
                'There was a problem unlocking the wallet.',
                (error as Error).message,
                1047
              )
            }
          }

          await agent.mediationRecipient.initiateMessagePickup()

          setStep(9)
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: Stacks.TabStack }],
            })
          )

          return
        }

        logger.info('No agent initialized, creating a new one')

        setStep(4)
        const cachedLedgers = await loadCachedLedgers()
        const ledgers = cachedLedgers ?? indyLedgers
        const options = {
          config: {
            label: store.preferences.walletName || 'BC Wallet',
            walletConfig: {
              id: walletSecret.id,
              key: walletSecret.key,
            },
            logger,
            mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
            autoUpdateStorageOnStartup: true,
            autoAcceptConnections: true,
          },
          dependencies: agentDependencies,
          modules: getBCAgentModules({
            indyNetworks: ledgers,
            mediatorInvitationUrl: Config.MEDIATOR_URL,
            txnCache: {
              capacity: 1000,
              expiryOffsetMs: 1000 * 60 * 60 * 24 * 7,
              path: CachesDirectoryPath + '/txn-cache',
            },
            enableProxy: store.developer.enableProxy,
            proxyBaseUrl: Config.INDY_VDR_PROXY_URL,
            proxyCacheSettings: {
              allowCaching: true,
              cacheDurationInSeconds: 60 * 60 * 24 * 7,
            },
          }),
        }

        logger.info(
          store.developer.enableProxy && Config.INDY_VDR_PROXY_URL ? 'VDR Proxy enabled' : 'VDR Proxy disabled'
        )

        const newAgent = new Agent(options)
        const wsTransport = new WsOutboundTransport()
        const httpTransport = new HttpOutboundTransport()

        newAgent.registerOutboundTransport(wsTransport)
        newAgent.registerOutboundTransport(httpTransport)

        // If we haven't migrated to Aries Askar yet, we need to do this before we initialize the agent.
        if (!store.migration.didMigrateToAskar) {
          logger.debug('Agent not updated to Aries Askar, updating...')

          await migrateToAskar(walletSecret.id, walletSecret.key, newAgent)

          logger.debug('Successfully finished updating agent to Aries Askar')
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await PersistentStorage.storeValueForKey<any>(BCLocalStorageKeys.GenesisTransactions, {
              timestamp: moment().toISOString(),
              transactions,
            })
          }
        }

        setStep(6)
        credDefs.forEach(async ({ did, id }) => {
          const pool = await poolService.getPoolForDid(newAgent.context, did)
          const credDefRequest = new GetCredentialDefinitionRequest({ credentialDefinitionId: id })
          await pool.pool.submitRequest(credDefRequest)
        })

        schemas.forEach(async ({ did, id }) => {
          const pool = await poolService.getPoolForDid(newAgent.context, did)
          const schemaRequest = new GetSchemaRequest({ schemaId: id })
          await pool.pool.submitRequest(schemaRequest)
        })

        setStep(7)
        await createLinkSecretIfRequired(newAgent)

        setStep(8)
        setAgent(newAgent)
        if (store.preferences.usePushNotifications) {
          activate(newAgent)
        }

        attestationMonitor?.start(newAgent)

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
    agent,
    setAgent,
    setStep,
    ocaBundleResolver,
    store.authentication.didAuthenticate,
    store.onboarding.postAuthScreens.length,
    store.onboarding.didConsiderBiometry,
    store.developer.enableProxy,
    store.migration.didMigrateToAskar,
    store.preferences.usePushNotifications,
    store.preferences.walletName,
    indyLedgers,
    credDefs,
    schemas,
    dispatch,
    navigation,
    logger,
    attestationMonitor,
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
