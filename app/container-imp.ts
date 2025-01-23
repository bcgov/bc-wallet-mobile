import { BaseLogger } from '@credo-ts/core'
import { IndyVdrPoolConfig } from '@credo-ts/indy-vdr'
import {
  Container,
  TOKENS,
  TokenMapping,
  ReducerAction,
  loadLoginAttempt,
  LocalStorageKeys,
  MigrationState,
  ToursState,
  OnboardingState,
  DispatchAction,
  Screens,
  defaultConfig as bifoldDefaultConfig,
} from '@hyperledger/aries-bifold-core'
import { Locales } from '@hyperledger/aries-bifold-core/App/localization'
import { DefaultScreenOptionsDictionary } from '@hyperledger/aries-bifold-core/App/navigators/defaultStackOptions'
import { Config as BifoldConfig } from '@hyperledger/aries-bifold-core/App/types/config'
import { InlineErrorPosition } from '@hyperledger/aries-bifold-core/App/types/error'
import { getProofRequestTemplates } from '@hyperledger/aries-bifold-verifier'
import { BrandingOverlayType, RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StackNavigationOptions } from '@react-navigation/stack'
import { Platform } from 'react-native'
import { Config } from 'react-native-config'
import { DependencyContainer } from 'tsyringe'

import ledgers from './config/ledgers'
import AddCredentialButton from './src/components/AddCredentialButton'
import AddCredentialSlider from './src/components/AddCredentialSlider'
import EmptyList from './src/components/EmptyList'
import HelpCenterButton from './src/components/Help/HelpCenterButton'
import HomeEmptyList from './src/components/HomeEmptyList'
import HomeFooter from './src/components/HomeFooter'
import HomeHeader from './src/components/HomeHeader'
import NotificationListItem from './src/components/NotificationListItem'
import PINCreateHeader from './src/components/PINCreateHeader'
import { PINValidationRules } from './src/constants'
import { useNotifications } from './src/hooks/notifications'
import TermsStack from './src/navigators/TermsStack'
import DefaultNotification from './src/screens/DefaultNotification'
import Developer from './src/screens/Developer'
import { pages } from './src/screens/OnboardingPages'
import Splash from './src/screens/Splash'
import { TermsVersion } from './src/screens/Terms'
import UseBiometry from './src/screens/UseBiometry'
import {
  BCDispatchAction,
  BCLocalStorageKeys,
  BCState,
  AttestationAuthentification,
  IASEnvironment,
  getInitialState,
  QCPreferences,
  ActivityState,
} from './src/store'

export interface AppState {
  showSurvey: boolean
}

const defaultConfig: BifoldConfig = {
  ...bifoldDefaultConfig,
  PINSecurity: { rules: PINValidationRules, displayHelper: true },
  enableChat: false,
  enableTours: true,
  supportedLanguages: [Locales.en, Locales.fr],
  showPreface: false,
  showPINExplainer: false,
  showScanErrorButton: false,
  whereToUseWalletUrl: undefined,
  enableReuseConnections: true,
  disableOnboardingSkip: true,
  enableHiddenDevModeTrigger: false,
  showScanHelp: true,
  showScanButton: true,
  showDetailsInfo: true,
  contactDetailsOptions: {
    showConnectedTime: false,
    enableEditContactName: false,
    enableCredentialList: true,
  },
}

export class AppContainer implements Container {
  private readonly _container: DependencyContainer
  private readonly log?: BaseLogger

  public constructor(bifoldContainer: Container, log?: BaseLogger) {
    this._container = bifoldContainer.container.createChildContainer()
    this.log = log
  }

  public get container(): DependencyContainer {
    return this._container
  }

  public init(): Container {
    this.log?.info(`Initializing QC Wallet App container`)

    const qcLedgers: IndyVdrPoolConfig[] = ledgers

    const indyLedgers = this._container.resolve(TOKENS.UTIL_LEDGERS) satisfies IndyVdrPoolConfig[]
    const allLedgers = [...qcLedgers, ...indyLedgers]

    const defaultScreenOptionsDict = DefaultScreenOptionsDictionary

    const onboardingScreenOptions: StackNavigationOptions = {
      headerShown: Platform.OS == 'ios',
      headerTitle: '',
      headerStyle: {
        height: 50,
      },
    }

    defaultScreenOptionsDict[Screens.Home] = {
      ...defaultScreenOptionsDict[Screens.Home],
      headerLeft: undefined,
      headerRight: HelpCenterButton,
    }
    defaultScreenOptionsDict[Screens.Connection] = {
      ...defaultScreenOptionsDict[Screens.Connection],
      headerLeft: undefined,
      headerRight: HelpCenterButton,
    }
    defaultScreenOptionsDict[Screens.CredentialDetails] = {
      ...defaultScreenOptionsDict[Screens.CredentialDetails],
      headerLeft: undefined,
      headerRight: HelpCenterButton,
    }

    defaultScreenOptionsDict[Screens.Credentials] = {
      ...defaultScreenOptionsDict[Screens.Credentials],
      headerLeft: undefined,
      headerRight: HelpCenterButton,
    }
    defaultScreenOptionsDict[Screens.Language] = {
      ...defaultScreenOptionsDict[Screens.Language],
      headerRight: HelpCenterButton,
    }
    defaultScreenOptionsDict[Screens.Scan] = {
      ...defaultScreenOptionsDict[Screens.Scan],
      headerRight: HelpCenterButton,
    }

    defaultScreenOptionsDict[Screens.UseBiometry] = {
      ...defaultScreenOptionsDict[Screens.UseBiometry],
      ...onboardingScreenOptions,
    }

    defaultScreenOptionsDict[Screens.CreatePIN] = {
      ...defaultScreenOptionsDict[Screens.CreatePIN],
      ...onboardingScreenOptions,
      gestureEnabled: true,
    }
    defaultScreenOptionsDict[Screens.Terms] = {
      ...defaultScreenOptionsDict[Screens.Terms],
      ...onboardingScreenOptions,
    }

    // Here you can register any component to override components in core package
    // Example: Replacing button in core with custom button
    this._container.registerInstance(TOKENS.UTIL_LEDGERS, allLedgers)
    this._container.registerInstance(TOKENS.SCREEN_ONBOARDING_PAGES, pages)
    this._container.registerInstance(TOKENS.OBJECT_SCREEN_CONFIG, defaultScreenOptionsDict)
    this._container.registerInstance(TOKENS.SCREEN_TERMS, { screen: TermsStack, version: TermsVersion })
    this._container.registerInstance(TOKENS.COMPONENT_PIN_CREATE_HEADER, PINCreateHeader)
    this._container.registerInstance(TOKENS.SCREEN_USE_BIOMETRY, UseBiometry)
    this._container.registerInstance(TOKENS.SCREEN_SPLASH, Splash)
    this._container.registerInstance(TOKENS.COMPONENT_HOME_HEADER, HomeHeader)
    this._container.registerInstance(TOKENS.COMPONENT_HOME_FOOTER, HomeFooter)
    this._container.registerInstance(TOKENS.COMPONENT_HOME_NOTIFICATIONS_EMPTY_LIST, HomeEmptyList)
    this._container.registerInstance(TOKENS.NOTIFICATIONS_LIST_ITEM, NotificationListItem)
    this._container.registerInstance(TOKENS.CONFIG, defaultConfig)
    this._container.registerInstance(TOKENS.HISTORY_ENABLED, true)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_LIST_FOOTER, AddCredentialButton)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_LIST_OPTIONS, AddCredentialSlider)
    this._container.registerInstance(TOKENS.COMPONENT_CRED_EMPTY_LIST, EmptyList)
    this._container.registerInstance(TOKENS.SCREEN_DEVELOPER, Developer)
    this._container.registerInstance(TOKENS.INLINE_ERRORS, {
      enabled: true,
      hasErrorIcon: false,
      position: InlineErrorPosition.Below,
    })

    const resolver = new RemoteOCABundleResolver(Config.OCA_URL ?? '', {
      brandingOverlayType: BrandingOverlayType.Branding10,
    })

    this._container.registerInstance(TOKENS.NOTIFICATIONS, {
      useNotifications,
      customNotificationConfig: {
        component: DefaultNotification,

        onCloseAction: (dispatch?: React.Dispatch<ReducerAction<string>>) => {
          if (dispatch) {
            dispatch({
              type: BCDispatchAction.ATTESTATION_AUTHENTIFICATION_DISMISS,
              payload: [{ isDismissed: true }],
            })
          }
        },
        pageTitle: 'DefaultNotification.PageTitle',
        title: 'DefaultNotification.Title',
        description: 'DefaultNotification.Description',
        buttonTitle: 'DefaultNotification.ButtonTitle',
      },
    })
    this._container.registerInstance(TOKENS.UTIL_OCA_RESOLVER, resolver)
    this._container.registerInstance(TOKENS.UTIL_PROOF_TEMPLATE, getProofRequestTemplates)
    this._container.registerInstance(TOKENS.LOAD_STATE, async (dispatch: React.Dispatch<ReducerAction<unknown>>) => {
      const loadState = async <Type>(key: LocalStorageKeys | BCLocalStorageKeys, updateVal: (val: Type) => void) => {
        const data = await AsyncStorage.getItem(key)
        if (data) {
          const dataAsJSON = JSON.parse(data) as Type
          updateVal(dataAsJSON)
        }
      }
      const initialState = await getInitialState()

      let loginAttempt = initialState.loginAttempt
      let preferences = initialState.preferences
      let migration = initialState.migration
      let tours = initialState.tours
      let onboarding = initialState.onboarding
      let attestationAuthentificationDissmissed = initialState.attestationAuthentification
      let activities = initialState.activities
      let { environment } = initialState.developer

      await Promise.all([
        loadLoginAttempt().then((data) => {
          if (data) {
            loginAttempt = data
          }
        }),
        loadState<QCPreferences>(LocalStorageKeys.Preferences, (val) => (preferences = val)),
        loadState<MigrationState>(LocalStorageKeys.Migration, (val) => (migration = val)),
        loadState<ToursState>(LocalStorageKeys.Tours, (val) => (tours = val)),
        loadState<OnboardingState>(LocalStorageKeys.Onboarding, (val) => (onboarding = val)),
        loadState<AttestationAuthentification>(
          BCLocalStorageKeys.AttestationAuthentification,
          (val) => (attestationAuthentificationDissmissed = val)
        ),
        loadState<ActivityState>(BCLocalStorageKeys.Activities, (val) => (activities = val)),
        loadState<IASEnvironment>(BCLocalStorageKeys.Environment, (val) => (environment = val)),
      ])
      const state: BCState = {
        ...initialState,
        loginAttempt: { ...initialState.loginAttempt, ...loginAttempt },
        preferences: { ...initialState.preferences, ...preferences },
        migration: { ...initialState.migration, ...migration },
        tours: { ...initialState.tours, ...tours },
        onboarding: { ...initialState.onboarding, ...onboarding, didCompleteTutorial: true },
        attestationAuthentification: {
          ...initialState.attestationAuthentification,
          ...attestationAuthentificationDissmissed,
        },
        activities,
        developer: {
          ...initialState.developer,
          environment,
        },
      }
      dispatch({ type: DispatchAction.STATE_DISPATCH, payload: [state] })
    })
    return this
  }

  public resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K] {
    return this._container.resolve(token)
  }
  public resolveAll<K extends keyof TokenMapping, T extends K[]>(
    tokens: [...T]
  ): { [I in keyof T]: TokenMapping[T[I]] } {
    return tokens.map((key) => this.resolve(key)!) as { [I in keyof T]: TokenMapping[T[I]] }
  }
}
