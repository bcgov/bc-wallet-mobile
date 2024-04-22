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
} from '@hyperledger/aries-bifold-core'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DependencyContainer } from 'tsyringe'

import Developer from './src/screens/Developer'
import Preface from './src/screens/Preface'
import Terms, { TermsVersion } from './src/screens/Terms'
import { BCLocalStorageKeys, BCState, DismissPersonCredentialOffer, IASEnvironment, initialState } from './src/store'

export class AppContainer implements Container {
  private container: DependencyContainer
  public constructor(bifoldContainer: Container) {
    this.container = bifoldContainer.getContainer().createChildContainer()
  }
  public init(): Container {
    // eslint-disable-next-line no-console
    console.log(`Initializing BC Wallet App container`)
    // Here you can register any component to override components in core package
    // Example: Replacing button in core with custom button
    this.container.registerInstance(TOKENS.SCREEN_PREFACE, Preface)
    this.container.registerInstance(TOKENS.SCREEN_TERMS, { screen: Terms, version: TermsVersion })
    this.container.registerInstance(TOKENS.SCREEN_DEVELOPER, Developer)
    this.container.registerInstance(TOKENS.LOAD_STATE, async (dispatch: React.Dispatch<ReducerAction<unknown>>) => {
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
    return this
  }

  public resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K] {
    return this.container.resolve(token) as TokenMapping[K]
  }

  public getContainer(): DependencyContainer {
    return this.container
  }
}
