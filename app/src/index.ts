import {
  translationResources,
  ConfigurationContext,
  Record,
  defaultConfiguration,
  Agent,
} from '@hyperledger/aries-bifold-core'
import merge from 'lodash.merge'
import { ReducerAction } from 'react'
import { Config } from 'react-native-config'

import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import HomeFooterView from './components/HomeFooterView'
import HomeHeaderView from './components/HomeHeaderView'
import { setup, activate, deactivate, status } from './helpers/PushNotificationsHelper'
import { useNotifications } from './hooks/notifications'
import en from './localization/en'
import fr from './localization/fr'
import ptBr from './localization/pt-br'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import PersonCredential from './screens/PersonCredential'
import Preface from './screens/Preface'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { useAttestation } from './services/attestation'
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
