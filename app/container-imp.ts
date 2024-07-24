import { BaseLogger } from '@credo-ts/core'
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
import { useProofRequestTemplates } from '@hyperledger/aries-bifold-verifier'
import { BrandingOverlayType, RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationProp } from '@react-navigation/native'
import { Config } from 'react-native-config'
import { DependencyContainer } from 'tsyringe'

import Developer from './src/screens/Developer'
import Terms, { TermsVersion } from './src/screens/Terms'
import { BCLocalStorageKeys, BCState, DismissPersonCredentialOffer, IASEnvironment, initialState } from './src/store'

export class AppContainer implements Container {
  private _container: DependencyContainer
  private log?: BaseLogger

  public constructor(bifoldContainer: Container, log?: BaseLogger) {
    this._container = bifoldContainer.container.createChildContainer()
    this.log = log
  }

  public get container(): DependencyContainer {
    return this._container
  }

  public init(): Container {
    this.log?.info(`Initializing BC Wallet App container`)

    // Here you can register any component to override components in core package
    // Example: Replacing button in core with custom button
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

      { did: '4xE68b6S5VRFrKMMG1U95M', id: '4xE68b6S5VRFrKMMG1U95M:3:CL:59232:default' },
      { did: 'L6ASjmDDbDH7yPL1t2yFj9', id: 'L6ASjmDDbDH7yPL1t2yFj9:3:CL:7162:member_card' },
      { did: 'M6dhuFj5UwbhWkSLmvYSPc', id: 'M6dhuFj5UwbhWkSLmvYSPc:3:CL:834686:member_card' },
      { did: 'QEquAHkM35w4XVT3Ku5yat', id: 'QEquAHkM35w4XVT3Ku5yat:3:CL:834674:member_card' },
      { did: 'AuJrigKQGRLJajKAebTgWu', id: 'AuJrigKQGRLJajKAebTgWu:3:CL:209526:default' },

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

      { did: '4xE68b6S5VRFrKMMG1U95M', id: '4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1' },
      { did: 'L6ASjmDDbDH7yPL1t2yFj9', id: 'L6ASjmDDbDH7yPL1t2yFj9:2:member_card:1.53' },
      { did: 'M6dhuFj5UwbhWkSLmvYSPc', id: 'M6dhuFj5UwbhWkSLmvYSPc:2:member_card:1.54' },
      { did: 'QEquAHkM35w4XVT3Ku5yat', id: 'QEquAHkM35w4XVT3Ku5yat:2:member_card:1.54' },
      { did: 'AuJrigKQGRLJajKAebTgWu', id: 'AuJrigKQGRLJajKAebTgWu:2:Member Card:1.5.1' },

      { did: 'RGjWbW1eycP7FrMf4QJvX8', id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0' },
      { did: 'L6ASjmDDbDH7yPL1t2yFj9', id: 'L6ASjmDDbDH7yPL1t2yFj9:2:Person:1.2' },
      { did: 'M6dhuFj5UwbhWkSLmvYSPc', id: 'M6dhuFj5UwbhWkSLmvYSPc:2:Person:1.3' },
      { did: 'QEquAHkM35w4XVT3Ku5yat', id: 'QEquAHkM35w4XVT3Ku5yat:2:Person:1.3' },
      { did: 'KCxVC8GkKywjhWJnUfCmkW', id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0' },
      { did: 'XpgeQa93eZvGSZBZef3PHn', id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0' },

      { did: 'AcZpBDz3oxmKrpcuPcdKai', id: 'AcZpBDz3oxmKrpcuPcdKai:2:Digital Business Card:1.0.0' },
      { did: 'K9igebFysBL6jcBwR8bKuN', id: 'K9igebFysBL6jcBwR8bKuN:2:Digital Business Card:1.0.0' },
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
    return this
  }

  public resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K] {
    return this._container.resolve(token) as TokenMapping[K]
  }
}
