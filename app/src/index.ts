import {
  translationResources,
  ConfigurationContext,
  Record,
  defaultConfiguration,
  Agent,
} from '@hyperledger/aries-bifold-core'
import merge from 'lodash.merge'
import { Config } from 'react-native-config'

import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import HomeFooterView from './components/HomeFooterView'
import HomeHeaderView from './components/HomeHeaderView'
import { AttestationRestrictions } from './constants'
import { setup, activate, deactivate, status } from './helpers/PushNotificationsHelper'
import en from './localization/en'
import fr from './localization/fr'
import ptBr from './localization/pt-br'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import Preface from './screens/Preface'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { allCredDefIds } from './services/attestation'
import { defaultTheme as theme } from './theme'

const attestationCredDefIds = allCredDefIds(AttestationRestrictions)

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
  enableTours: true,
  showPreface: true,
  disableOnboardingSkip: true,
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
  credentialHideList: attestationCredDefIds,
}

export default { theme, localization, configuration }
