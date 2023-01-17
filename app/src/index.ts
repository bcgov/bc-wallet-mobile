import {
  translationResources,
  ConfigurationContext,
  types,
  Record,
  indyLedgers,
  defaultConfiguration,
} from 'aries-bifold'
import { Bundles } from 'aries-bifold/lib/typescript/App/types/oca'
import merge from 'lodash.merge'

import UseBiometry from '../../bifold/core/App/screens/UseBiometry'

import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import { PINValidationRules } from './constants'
import en from './localization/en'
import fr from './localization/fr'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { defaultTheme as theme } from './theme'

const localization = merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
})

const selectedLedgers = indyLedgers.filter((item) => !item.id.startsWith('Indicio'))

const configuration: ConfigurationContext = {
  ...defaultConfiguration,
  pages,
  splash: Splash,
  terms: Terms,
  OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./assets/branding/oca-bundle-qc.json') as Bundles
  ),
  useBiometry: UseBiometry,
  credentialListHeaderRight: AddCredentialButton,
  credentialListOptions: AddCredentialSlider,
  credentialEmptyList: EmptyList,
  developer: Developer,
  record: Record,
  PINSecurity: { rules: PINValidationRules, displayHelper: true },
  indyLedgers: selectedLedgers,
  settings: [],
}

export default { theme, localization, configuration }
