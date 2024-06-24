import {
  Container,
  TOKENS,
  TokenMapping,
  ReducerAction,
  loadLoginAttempt,
  LocalStorageKeys,
  PreferencesState,
  MigrationState,
  ToursState,
  OnboardingState,
  DispatchAction,
  Stacks,
  Screens,
} from '@hyperledger/aries-bifold-core'
import { RemoteLogger, RemoteLoggerOptions } from '@hyperledger/aries-bifold-remote-logs'
import { BrandingOverlayType, RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp } from '@react-navigation/native'
import { Config } from 'react-native-config'
import {
  getVersion,
  getBuildNumber,
  getApplicationName,
  getSystemName,
  getSystemVersion,
} from 'react-native-device-info'
import { DependencyContainer } from 'tsyringe'

import { autoDisableRemoteLoggingIntervalInMinutes } from './src/constants'
import Developer from './src/screens/Developer'
import Preface from './src/screens/Preface'
import Terms, { TermsVersion } from './src/screens/Terms'
import { BCLocalStorageKeys, BCState, DismissPersonCredentialOffer, IASEnvironment, initialState } from './src/store'
import { useProofRequestTemplates } from '@hyperledger/aries-bifold-verifier'

export class AppContainer implements Container {
  private _container: DependencyContainer

  public constructor(bifoldContainer: Container) {
    this._container = bifoldContainer.container.createChildContainer()
  }

  public get container(): DependencyContainer {
    return this._container
  }

  public init(): Container {
    // eslint-disable-next-line no-console
    console.log(`Initializing BC Wallet App container`)
    // Here you can register any component to override components in core package
    // Example: Replacing button in core with custom button
    this._container.registerInstance(TOKENS.SCREEN_PREFACE, Preface)
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
    this._container.registerInstance(TOKENS.SCREEN_TERMS, { screen: Terms, version: TermsVersion })
    this._container.registerInstance(TOKENS.SCREEN_DEVELOPER, Developer)

    const resolver = new RemoteOCABundleResolver(Config.OCA_URL ?? '', {
      brandingOverlayType: BrandingOverlayType.Branding10,
    })
    this._container.registerInstance(TOKENS.UTIL_OCA_RESOLVER, resolver)

    this._container.registerInstance(TOKENS.UTIL_PROOF_TEMPLATE, useProofRequestTemplates)
    this._container.registerInstance(TOKENS.LOAD_STATE, async (dispatch: React.Dispatch<ReducerAction<unknown>>) => {
      const loadState = async <Type>(key: LocalStorageKeys | BCLocalStorageKeys, updateVal: (val: Type) => void) => {
        const data = await AsyncStorage.getItem(key)
        if (data) {
          const dataAsJSON = JSON.parse(data) as Type
          updateVal(dataAsJSON)
        }
      }

      let loginAttempt = initialState.loginAttempt
      let preferences = initialState.preferences
      let migration = initialState.migration
      let tours = initialState.tours
      let onboarding = initialState.onboarding
      let personCredOfferDissmissed = initialState.dismissPersonCredentialOffer
      let environment = initialState.developer.environment

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
      ])
      const state: BCState = {
        ...initialState,
        loginAttempt: { ...initialState.loginAttempt, ...loginAttempt },
        preferences: { ...initialState.preferences, ...preferences },
        migration: { ...initialState.migration, ...migration },
        tours: { ...initialState.tours, ...tours },
        onboarding: { ...initialState.onboarding, ...onboarding },
        dismissPersonCredentialOffer: { ...initialState.dismissPersonCredentialOffer, ...personCredOfferDissmissed },
        developer: {
          ...initialState.developer,
          environment,
        },
      }
      dispatch({ type: DispatchAction.STATE_DISPATCH, payload: [state] })
    })

    const logOptions: RemoteLoggerOptions = {
      lokiUrl: Config.REMOTE_LOGGING_URL,
      lokiLabels: {
        application: getApplicationName().toLowerCase(),
        job: 'react-native-logs',
        version: `${getVersion()}-${getBuildNumber()}`,
        system: `${getSystemName()} v${getSystemVersion()}`,
      },
      autoDisableRemoteLoggingIntervalInMinutes,
    }
    const logger = new RemoteLogger(logOptions)
    logger.startEventListeners()
    this._container.registerInstance(TOKENS.UTIL_LOGGER, logger)

    return this
  }

  public resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K] {
    return this._container.resolve(token) as TokenMapping[K]
  }

  // public resolveSome<K extends keyof TokenMapping>(tokens: K[]): TokenMapping[K][] {
  //   return tokens.map((token) => this.resolve(token))
  // }
}
