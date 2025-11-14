import {
  Biometry,
  Container,
  DispatchAction,
  InlineErrorPosition,
  LocalStorageKeys,
  MigrationState,
  Onboarding,
  OnboardingState,
  PINRules,
  PersistentState,
  PersistentStorage,
  PreferencesState,
  Record,
  ReducerAction,
  Scan,
  Screens,
  Stacks,
  TOKENS,
  TokenMapping,
  ToursState,
  defaultConfig,
  loadLoginAttempt,
  testIdWithKey,
} from '@bifold/core'
import { BrandingOverlayType, RemoteOCABundleResolver } from '@bifold/oca/build/legacy'
import { getProofRequestTemplates } from '@bifold/verifier'
import { Agent } from '@credo-ts/core'
import { NavigationProp } from '@react-navigation/native'
import moment from 'moment'
import { TFunction } from 'react-i18next'
import { Linking } from 'react-native'
import { Config } from 'react-native-config'
import { DependencyContainer } from 'tsyringe'

import filePersistedLedgers from '@/configs/ledgers/indy/ledgers'
import useBCAgentSetup from '@/hooks/useBCAgentSetup'
import { activate, deactivate, setup, status } from '@utils/PushNotificationsHelper'
import { expirationOverrideInMinutes } from '@utils/expiration'
import { appLogger, createAppLogger } from '@utils/logger'
import AddCredentialButton from './src/bcwallet-theme/components/AddCredentialButton'
import AddCredentialSlider from './src/bcwallet-theme/components/AddCredentialSlider'
import EmptyList from './src/bcwallet-theme/components/EmptyList'
import HomeFooterView from './src/bcwallet-theme/components/HomeFooterView'
import HomeHeaderView from './src/bcwallet-theme/components/HomeHeaderView'
import PersonCredential from './src/bcwallet-theme/features/person-flow/screens/PersonCredential'
import PersonCredentialLoading from './src/bcwallet-theme/features/person-flow/screens/PersonCredentialLoading'
import { pages } from './src/components/OnboardingPages'
import {
  AttestationRestrictions,
  appHelpUrl,
  appleAppStoreUrl,
  autoDisableRemoteLoggingIntervalInMinutes,
  googlePlayStoreUrl,
} from './src/constants'
import { useNotifications } from './src/hooks/notifications'
import { generateOnboardingWorkflowSteps } from './src/onboarding'
import Developer from './src/screens/Developer'
import PINExplainer from './src/screens/PINExplainer'
import Preface from './src/screens/Preface'
import Splash from './src/screens/Splash'
import Terms, { TermsVersion } from './src/screens/Terms'
import { AttestationMonitor, allCredDefIds } from './src/services/attestation'
import { VersionCheckService } from './src/services/version'
import {
  BCDispatchAction,
  BCLocalStorageKeys,
  BCSCState,
  BCState,
  DismissPersonCredentialOffer,
  IASEnvironment,
  Mode,
  RemoteDebuggingState,
  initialState,
} from './src/store'

const attestationCredDefIds = allCredDefIds(AttestationRestrictions)

export class AppContainer implements Container {
  private _container: DependencyContainer
  private t: TFunction<'translation', undefined>
  private navigate: (stack: never, params: never) => void
  private storage: PersistentStorage<PersistentState>
  readonly setSurveyVisible: (visible: boolean) => void

  public constructor(
    bifoldContainer: Container,
    t: TFunction<'translation', undefined>,
    navigate: (stack: never, params: never) => void,
    setSurveyVisible: (visible: boolean) => void
  ) {
    this._container = bifoldContainer.container.createChildContainer()
    this.t = t
    this.navigate = navigate
    this.setSurveyVisible = setSurveyVisible
    // Using factory for testability; appLogger is a legacy
    // singleton fallback.
    const loggerInstance = appLogger ?? createAppLogger()
    this.storage = new PersistentStorage(loggerInstance)
  }

  public get container(): DependencyContainer {
    return this._container
  }

  public init(): Container {
    const logger = appLogger ?? createAppLogger()
    logger.startEventListeners()

    const options = {
      shouldHandleProofRequestAutomatically: true,
    }

    this._container.registerInstance(TOKENS.UTIL_ATTESTATION_MONITOR, new AttestationMonitor(logger, options))
    this._container.registerInstance(TOKENS.UTIL_APP_VERSION_MONITOR, new VersionCheckService(logger))
    // Here you can register any component to override components in core package
    // Example: Replacing button in core with custom button
    this._container.registerInstance(TOKENS.SCREEN_PREFACE, Preface)
    this._container.registerInstance(TOKENS.SCREEN_SPLASH, Splash)
    this._container.registerInstance(TOKENS.SCREEN_ONBOARDING_PAGES, pages)
    this._container.registerInstance(TOKENS.SCREEN_BIOMETRY, Biometry)
    this._container.registerInstance(TOKENS.SCREEN_SCAN, Scan)
    this._container.registerInstance(TOKENS.SCREEN_ONBOARDING_ITEM, Onboarding)
    this._container.registerInstance(TOKENS.UTIL_LEDGERS, filePersistedLedgers)

    this._container.registerInstance(TOKENS.CRED_HELP_ACTION_OVERRIDES, [
      {
        credDefIds: [
          'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
          'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:PersonQA',
          '7xjfawcnyTUcduWVysLww5:3:CL:28075:PersonSIT',
          'XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV',
        ],
        schemaIds: [
          'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0',
          'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0',
          '7xjfawcnyTUcduWVysLww5:2:Person:1.0',
          'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0',
        ],
        action: (navigation: NavigationProp<ReactNavigation.RootParamList>) => {
          navigation.getParent()?.navigate(Stacks.NotificationStack, {
            screen: Screens.CustomNotification,
          })
        },
      },
    ])
    this._container.registerInstance(TOKENS.CONFIG, {
      ...defaultConfig,
      PINSecurity: { rules: PINRules, displayHelper: false },
      settings: [
        {
          header: {
            title: this.t('Settings.Help'),
            icon: { name: 'help' },
          },
          data: [
            {
              title: this.t('Settings.HelpUsingBCWallet'),
              accessibilityLabel: this.t('Settings.HelpUsingBCWallet'),
              testID: testIdWithKey('HelpUsingBCWallet'),
              onPress: () => Linking.openURL(appHelpUrl),
            },
            {
              title: this.t('Settings.GiveFeedback'),
              accessibilityLabel: this.t('Settings.GiveFeedback'),
              testID: testIdWithKey('GiveFeedback'),
              onPress: () => this.setSurveyVisible(true),
            },
            {
              title: this.t('Settings.ReportAProblem'),
              accessibilityLabel: this.t('Settings.ReportAProblem'),
              testID: testIdWithKey('ReportAProblem'),
              onPress: () => this.setSurveyVisible(true),
            },
          ],
        },
        {
          header: {
            title: this.t('Settings.MoreInformation'),
            icon: { name: 'info' },
          },
          data: [
            {
              title: this.t('Settings.TermsOfUse'),
              accessibilityLabel: this.t('Settings.TermsOfUse'),
              testID: testIdWithKey('TermsOfUse'),
              onPress: () => this.navigate(Stacks.SettingStack as never, { screen: Screens.Terms } as never),
            },
            {
              title: this.t('Settings.IntroductionToTheApp'),
              accessibilityLabel: this.t('Settings.IntroductionToTheApp'),
              testID: testIdWithKey('IntroductionToTheApp'),
              onPress: () => this.navigate(Stacks.SettingStack as never, { screen: Screens.Onboarding } as never),
            },
            {
              title: this.t('Settings.PlayWithBCWallet'),
              accessibilityLabel: this.t('Settings.PlayWithBCWallet'),
              testID: testIdWithKey('PlayWithBCWallet'),
              onPress: () => Linking.openURL('https://digital.gov.bc.ca/digital-trust/showcase/'),
            },
          ],
        },
      ],
      enableTours: true,
      enableChat: true,
      enableReuseConnections: true,
      enableHiddenDevModeTrigger: true,
      preventScreenCapture: false,
      supportedLanguages: ['en'],
      showPreface: true,
      disableOnboardingSkip: true,
      whereToUseWalletUrl: 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet#where',
      showScanHelp: true,
      showScanButton: true,
      showDetailsInfo: true,
      contactHideList: ['BCAttestationService'],
      proofTemplateBaseUrl: Config.PROOF_TEMPLATE_URL,
      // Credential Definition IDs
      credentialHideList: attestationCredDefIds,
      enablePushNotifications: {
        status: status,
        setup: setup,
        toggle: async (state: boolean, agent: Agent) => {
          if (state) {
            await activate(agent)
          } else {
            await deactivate(agent)
          }
        },
      },
      appUpdateConfig: {
        appleAppStoreUrl,
        googlePlayStoreUrl,
      },
    })
    this._container.registerInstance(TOKENS.HOOK_USE_AGENT_SETUP, useBCAgentSetup)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_LIST_HEADER_RIGHT, AddCredentialButton)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_LIST_OPTIONS, AddCredentialSlider)
    this._container.registerInstance(TOKENS.COMPONENT_HOME_HEADER, HomeHeaderView)
    this._container.registerInstance(TOKENS.COMPONENT_HOME_FOOTER, HomeFooterView)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_EMPTY_LIST, EmptyList)
    this._container.registerInstance(TOKENS.COMPONENT_RECORD, Record)
    this._container.registerInstance(TOKENS.CACHE_CRED_DEFS, [
      // { did: "4WW6792ksq62UroZyfd6nQ", id: "4WW6792ksq62UroZyfd6nQ:3:CL:1098:SellingItRight" },
      { did: 'TeT8SJGHruVL9up3Erp4o', id: 'TeT8SJGHruVL9up3Erp4o:3:CL:224665:Selling It Right' },
      { did: 'TeT8SJGHruVL9up3Erp4o', id: 'TeT8SJGHruVL9up3Erp4o:3:CL:400095:SellingItRight' },
      { did: 'Ttmj1pEotg8FbKZZD81S7i', id: 'Ttmj1pEotg8FbKZZD81S7i:3:CL:184:SellingItRight' },
      // { did: "4WW6792ksq62UroZyfd6nQ", id: "4WW6792ksq62UroZyfd6nQ:3:CL:1098:ServingItRight" },
      { did: 'TeT8SJGHruVL9up3Erp4o', id: 'TeT8SJGHruVL9up3Erp4o:3:CL:224665:Serving It Right' },
      { did: 'TeT8SJGHruVL9up3Erp4o', id: 'TeT8SJGHruVL9up3Erp4o:3:CL:400095:ServingItRight' },
      { did: 'Ttmj1pEotg8FbKZZD81S7i', id: 'Ttmj1pEotg8FbKZZD81S7i:3:CL:184:ServingItRight' },
      // { did: "4WW6792ksq62UroZyfd6nQ", id: "4WW6792ksq62UroZyfd6nQ:3:CL:1098:SpecialEventServer" },
      { did: 'TeT8SJGHruVL9up3Erp4o', id: 'TeT8SJGHruVL9up3Erp4o:3:CL:224665:Special Event Server' },
      { did: 'TeT8SJGHruVL9up3Erp4o', id: 'TeT8SJGHruVL9up3Erp4o:3:CL:400095:SpecialEventServer' },
      { did: 'Ttmj1pEotg8FbKZZD81S7i', id: 'Ttmj1pEotg8FbKZZD81S7i:3:CL:184:SpecialEventServer' },

      { did: 'QzLYGuAebsy3MXQ6b1sFiT', id: 'QzLYGuAebsy3MXQ6b1sFiT:3:CL:2351:lawyer' }, // prod lawyer credential
      { did: 'L6ASjmDDbDH7yPL1t2yFj9', id: 'L6ASjmDDbDH7yPL1t2yFj9:3:CL:7162:member_card' },
      { did: 'M6dhuFj5UwbhWkSLmvYSPc', id: 'M6dhuFj5UwbhWkSLmvYSPc:3:CL:834686:member_card' },
      { did: 'QEquAHkM35w4XVT3Ku5yat', id: 'QEquAHkM35w4XVT3Ku5yat:3:CL:834674:member_card' },

      { did: 'RGjWbW1eycP7FrMf4QJvX8', id: 'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person' },
      { did: 'L6ASjmDDbDH7yPL1t2yFj9', id: 'L6ASjmDDbDH7yPL1t2yFj9:3:CL:257:Person' },
      { did: 'M6dhuFj5UwbhWkSLmvYSPc', id: 'M6dhuFj5UwbhWkSLmvYSPc:3:CL:834685:Person' },
      { did: 'QEquAHkM35w4XVT3Ku5yat', id: 'QEquAHkM35w4XVT3Ku5yat:3:CL:834664:Person' },
      { did: 'KCxVC8GkKywjhWJnUfCmkW', id: 'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:PersonQA' },
      { did: '7xjfawcnyTUcduWVysLww5', id: '7xjfawcnyTUcduWVysLww5:3:CL:28075:PersonSIT' },
      { did: 'XpgeQa93eZvGSZBZef3PHn', id: 'XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV' },

      { did: 'AcZpBDz3oxmKrpcuPcdKai', id: 'AcZpBDz3oxmKrpcuPcdKai:3:CL:350:default' },
      { did: 'K9igebFysBL6jcBwR8bKuN', id: 'K9igebFysBL6jcBwR8bKuN:3:CL:61:default' },
    ])
    this._container.registerInstance(TOKENS.CACHE_SCHEMAS, [
      { did: 'TeT8SJGHruVL9up3Erp4o', id: 'TeT8SJGHruVL9up3Erp4o:2:LCRB:1.1.1' },
      { did: 'TeT8SJGHruVL9up3Erp4o', id: 'TeT8SJGHruVL9up3Erp4o:2:LCRBSirSes:1.0.0' },
      { did: 'Ttmj1pEotg8FbKZZD81S7i', id: 'Ttmj1pEotg8FbKZZD81S7i:2:LCRBSirSes:1.0.0' },

      { did: 'QzLYGuAebsy3MXQ6b1sFiT', id: 'QzLYGuAebsy3MXQ6b1sFiT:2:legal-professional:1.0' }, // schema used for prod lawyer credential
      { did: 'L6ASjmDDbDH7yPL1t2yFj9', id: 'L6ASjmDDbDH7yPL1t2yFj9:2:member_card:1.53' },
      { did: 'M6dhuFj5UwbhWkSLmvYSPc', id: 'M6dhuFj5UwbhWkSLmvYSPc:2:member_card:1.54' },
      { did: 'QEquAHkM35w4XVT3Ku5yat', id: 'QEquAHkM35w4XVT3Ku5yat:2:member_card:1.54' },

      { did: 'RGjWbW1eycP7FrMf4QJvX8', id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0' },
      { did: 'L6ASjmDDbDH7yPL1t2yFj9', id: 'L6ASjmDDbDH7yPL1t2yFj9:2:Person:1.2' },
      { did: 'M6dhuFj5UwbhWkSLmvYSPc', id: 'M6dhuFj5UwbhWkSLmvYSPc:2:Person:1.3' },
      { did: 'QEquAHkM35w4XVT3Ku5yat', id: 'QEquAHkM35w4XVT3Ku5yat:2:Person:1.3' },
      { did: 'KCxVC8GkKywjhWJnUfCmkW', id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0' },
      { did: 'XpgeQa93eZvGSZBZef3PHn', id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0' },

      { did: 'AcZpBDz3oxmKrpcuPcdKai', id: 'AcZpBDz3oxmKrpcuPcdKai:2:Digital Business Card:1.0.0' },
      { did: 'K9igebFysBL6jcBwR8bKuN', id: 'K9igebFysBL6jcBwR8bKuN:2:Digital Business Card:1.0.0' },
    ])
    this._container.registerInstance(TOKENS.INLINE_ERRORS, { enabled: true, position: InlineErrorPosition.Below })
    this._container.registerInstance(TOKENS.SCREEN_TERMS, { screen: Terms, version: TermsVersion })
    this._container.registerInstance(TOKENS.SCREEN_PIN_EXPLAINER, PINExplainer)
    this._container.registerInstance(TOKENS.SCREEN_DEVELOPER, Developer)

    const resolver = new RemoteOCABundleResolver(Config.OCA_URL ?? '', {
      brandingOverlayType: BrandingOverlayType.Branding10,
      verifyCacheIntegrity: true,
    })
    resolver.log = logger
    this._container.registerInstance(TOKENS.UTIL_OCA_RESOLVER, resolver)
    this._container.registerInstance(TOKENS.NOTIFICATIONS, {
      useNotifications,
      customNotificationConfig: {
        component: PersonCredential,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onCloseAction: (dispatch?: React.Dispatch<ReducerAction<any>>) => {
          if (dispatch) {
            dispatch({
              type: BCDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED,
              payload: [{ personCredentialOfferDismissed: true }],
            })
          }
        },
        additionalStackItems: [
          {
            component: PersonCredentialLoading,
            name: 'PersonCredentialLoading',
            stackOptions: { headerShown: false },
          },
        ],
        pageTitle: 'PersonCredential.PageTitle',
        title: 'PersonCredentialNotification.Title',
        description: 'PersonCredentialNotification.Description',
        buttonTitle: 'PersonCredentialNotification.ButtonTitle',
      },
    })

    this._container.registerInstance(TOKENS.UTIL_PROOF_TEMPLATE, getProofRequestTemplates)
    this._container.registerInstance(TOKENS.LOAD_STATE, async (dispatch: React.Dispatch<ReducerAction<unknown>>) => {
      const loadState = async <Type>(key: LocalStorageKeys | BCLocalStorageKeys, updateVal: (val: Type) => void) => {
        const data = (await this.storage.getValueForKey(key)) as Type
        if (data) {
          updateVal(data)
        }
      }

      let loginAttempt = initialState.loginAttempt
      let preferences = initialState.preferences
      let migration = initialState.migration
      let tours = initialState.tours
      let onboarding = initialState.onboarding
      let personCredOfferDissmissed = initialState.dismissPersonCredentialOffer
      let { environment, remoteDebugging, enableProxy, enableAppToAppPersonFlow } = initialState.developer
      let bcsc = initialState.bcsc
      let mode = initialState.mode

      await Promise.all([
        loadLoginAttempt().then((data) => {
          if (data) {
            loginAttempt = data
          }
        }),
        loadState<PreferencesState>(LocalStorageKeys.Preferences, (val) => (preferences = val)),
        loadState<MigrationState>(LocalStorageKeys.Migration, (val) => (migration = val)),
        loadState<ToursState>(LocalStorageKeys.Tours, (val) => (tours = val)),
        loadState<OnboardingState>(LocalStorageKeys.Onboarding, (val) => (onboarding = val)),
        loadState<DismissPersonCredentialOffer>(
          BCLocalStorageKeys.PersonCredentialOfferDismissed,
          (val) => (personCredOfferDissmissed = val)
        ),
        loadState<IASEnvironment>(BCLocalStorageKeys.Environment, (val) => (environment = val)),
        loadState<RemoteDebuggingState>(BCLocalStorageKeys.RemoteDebugging, (val) => (remoteDebugging = val)),
        loadState<boolean>(BCLocalStorageKeys.EnableProxy, (val) => (enableProxy = val)),
        loadState<boolean>(BCLocalStorageKeys.EnableAppToAppPersonFlow, (val) => (enableAppToAppPersonFlow = val)),
        loadState<BCSCState>(BCLocalStorageKeys.BCSC, (val) => (bcsc = val)),
        loadState<Mode>(BCLocalStorageKeys.Mode, (val) => (mode = val)),
      ])

      // Convert date string to Date object (async-storage converts Dates to strings)
      // timezone-safe parsing to prevent off-by-one date errors (consistent with date picker)
      if (typeof bcsc.birthdate === 'string') {
        const momentDate = moment(bcsc.birthdate)
        const year = momentDate.year()
        const month = momentDate.month()
        const day = momentDate.date()
        bcsc.birthdate = new Date(year, month, day, 12, 0, 0, 0)
      }

      if (typeof bcsc.deviceCodeExpiresAt === 'string') {
        bcsc.deviceCodeExpiresAt = new Date(Date.parse(bcsc.deviceCodeExpiresAt))
      }

      // Reset paths and prompts on load as they should not be persisted
      bcsc.selectedNickname = undefined
      bcsc.photoPath = undefined
      bcsc.videoPath = undefined
      bcsc.videoThumbnailPath = undefined
      bcsc.prompts = undefined
      bcsc.photoMetadata = undefined
      bcsc.videoMetadata = undefined

      const state = {
        loginAttempt: { ...initialState.loginAttempt, ...loginAttempt },
        preferences: { ...initialState.preferences, ...preferences },
        migration: { ...initialState.migration, ...migration },
        tours: { ...initialState.tours, ...tours },
        onboarding: { ...initialState.onboarding, ...onboarding },
        dismissPersonCredentialOffer: { ...initialState.dismissPersonCredentialOffer, ...personCredOfferDissmissed },
        developer: {
          ...initialState.developer,
          environment,
          remoteDebugging: {
            enabledAt: remoteDebugging.enabledAt ? new Date(remoteDebugging.enabledAt) : undefined,
            sessionId: remoteDebugging.sessionId,
          },
          enableProxy,
          enableAppToAppPersonFlow,
        },
        bcsc: { ...initialState.bcsc, ...bcsc },
        mode,
      } as BCState

      const { enabledAt, sessionId } = state.developer.remoteDebugging
      if (enabledAt && sessionId) {
        const override = expirationOverrideInMinutes(enabledAt, autoDisableRemoteLoggingIntervalInMinutes)

        if (override > 0) {
          logger.remoteLoggingEnabled = true
          logger.sessionId = sessionId
          logger.overrideCurrentAutoDisableExpiration(override)

          logger.info(
            `Remote logging enabled, last enabled at ${enabledAt}, session id: ${logger.sessionId}.  Expiration override is ${override} minutes`
          )
        }
      }

      dispatch({ type: DispatchAction.STATE_DISPATCH, payload: [state] })
    })

    this._container.registerInstance(TOKENS.ONBOARDING, generateOnboardingWorkflowSteps)

    this._container.registerInstance(TOKENS.UTIL_LOGGER, logger)

    return this
  }

  public resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K] {
    return this._container.resolve(token) as TokenMapping[K]
  }

  public resolveAll<K extends keyof TokenMapping, T extends K[]>(
    tokens: [...T]
  ): { [I in keyof T]: TokenMapping[T[I]] } {
    return tokens.map((key) => this.resolve(key)!) as { [I in keyof T]: TokenMapping[T[I]] }
  }
}
