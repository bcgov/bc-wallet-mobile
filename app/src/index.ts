import {
  translationResources,
  ConfigurationContext,
  Record,
  defaultConfiguration,
  Stacks,
  Screens,
  Agent,
} from '@hyperledger/aries-bifold-core'
import merge from 'lodash.merge'
import { ReducerAction } from 'react'
import { Linking } from 'react-native'
import { Config } from 'react-native-config'

import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import HomeFooterView from './components/HomeFooterView'
import HomeHeaderView from './components/HomeHeaderView'
import { setup, activate, deactivate, status } from './helpers/PushNotificationsHelper'
import { useNotifications } from './hooks/notifications'
import { useAttestation } from './hooks/useAttestation'
import en from './localization/en'
import fr from './localization/fr'
import ptBr from './localization/pt-br'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import PersonCredential from './screens/PersonCredential'
import Preface from './screens/Preface'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { BCDispatchAction } from './store'
import { defaultTheme as theme } from './theme'

const localization = merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
  'pt-BR': { translation: ptBr },
})
const configuration: ConfigurationContext = {
  ...defaultConfiguration,
  pages,
  splash: Splash,
  terms: Terms,
  preface: Preface,
  homeHeaderView: HomeHeaderView,
  homeFooterView: HomeFooterView,
  credentialListHeaderRight: AddCredentialButton,
  credentialListOptions: AddCredentialSlider,
  credentialEmptyList: EmptyList,
  developer: Developer,
  proofTemplateBaseUrl: Config.PROOF_TEMPLATE_URL,
  record: Record,
  settings: [],
  customNotification: {
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
    pageTitle: 'PersonCredential.PageTitle',
    title: 'PersonCredentialNotification.Title',
    description: 'PersonCredentialNotification.Description',
    buttonTitle: 'PersonCredentialNotification.ButtonTitle',
  },
  enableTours: true,
  showPreface: true,
  disableOnboardingSkip: true,
  useCustomNotifications: useNotifications,
  useAttestation: useAttestation,
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
  whereToUseWalletUrl: 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet#where',
  getCredentialHelpDictionary: [
    {
      // Person Credential
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
      action: (navigation) => {
        navigation.getParent()?.navigate(Stacks.NotificationStack, {
          screen: Screens.CustomNotification,
        })
      },
    },
    {
      // Member Card
      credDefIds: ['4xE68b6S5VRFrKMMG1U95M:3:CL:59232:default'],
      schemaIds: ['4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1'],
      action: () => {
        Linking.openURL('https://www.lawsociety.bc.ca/lsbc/apps/members/login.cfm')
      },
    },
  ],
  // Contact theirLabel or alias
  contactHideList: ['BCAttestationService'],
  // Credential Definition IDs
  credentialHideList: [
    'NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet',
    'RycQpZ9b4NaXuT5ZGjXkUE:3:CL:120:bcwallet',
    'XqaRXJt4sXE6TRpfGpVbGw:3:CL:655:bcwallet',
  ],
}

export default { theme, localization, configuration }
