import {
  translationResources,
  ConfigurationContext,
  Record,
  defaultConfiguration,
  Locales,
} from '@hyperledger/aries-bifold-core'
import merge from 'lodash.merge'
import { Config } from 'react-native-config'

import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import { PINValidationRules } from './constants'
import { useAttestation } from './hooks/useAttestation'
import en from './localization/en'
import fr from './localization/fr'
import TermsStack from './navigators/TermsStack'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import Splash from './screens/Splash'
import { defaultTheme as theme } from './theme'

const localization = merge(
  {},
  { en: translationResources.en, fr: translationResources.fr },
  {
    en: { translation: en },
    fr: { translation: fr },
  }
)

const configuration: ConfigurationContext = {
  ...defaultConfiguration,
  pages,
  splash: Splash,
  terms: TermsStack,
  credentialListHeaderRight: AddCredentialButton,
  credentialListOptions: AddCredentialSlider,
  credentialEmptyList: EmptyList,
  developer: Developer,
  proofTemplateBaseUrl: Config.PROOF_TEMPLATE_URL,
  record: Record,
  PINSecurity: { rules: PINValidationRules, displayHelper: true },
  settings: [],
  enableTours: true,
  supportedLanguages: Object.keys(localization) as Locales[],
  useAttestation: useAttestation,
  enableReuseConnections: true,
}

export default { theme, localization, configuration }
