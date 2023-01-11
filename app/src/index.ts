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

import bundles from './assets/branding/credential-branding'
import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import BCIDView from './components/BCIDView'
import EmptyList from './components/EmptyList'
import en from './localization/en'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { defaultTheme as theme } from './theme'

const localization = merge({}, translationResources, {
  en: { translation: en },
})

const selectedLedgers = indyLedgers.filter((item) => !item.id.startsWith('Indicio'))
const configuration: ConfigurationContext = {
  ...defaultConfiguration,
  pages,
  splash: Splash,
  terms: Terms,
  homeContentView: BCIDView,
  credentialListHeaderRight: AddCredentialButton,
  credentialListOptions: AddCredentialSlider,
  credentialEmptyList: EmptyList,
  developer: Developer,
  OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(bundles as unknown as Bundles),
  record: Record,
  indyLedgers: selectedLedgers,
  settings: [],
}

export default { theme, localization, configuration }
