import { translationResources, ConfigurationContext, types, Record, indyLedgers } from 'aries-bifold'
import { Bundles } from 'aries-bifold/lib/typescript/App/types/oca'
import merge from 'lodash.merge'

import UseBiometry from '../../bifold/core/App/screens/UseBiometry'

import bundles from './assets/branding/credential-branding'
import BCIDView from './components/BCIDView'
import en from './localization/en'
import { pages } from './screens/OnboardingPages'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { defaultTheme as theme } from './theme'

const localization = merge({}, translationResources, {
  en: { translation: en },
})

const selectedLedgers = indyLedgers.filter((item) => !item.id.startsWith('Indicio'))
const configuration: ConfigurationContext = {
  pages,
  splash: Splash,
  terms: Terms,
  homeContentView: BCIDView,
  OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(bundles as unknown as Bundles),
  useBiometry: UseBiometry,
  record: Record,
  indyLedgers: selectedLedgers,
  settings: [],
  developer: () => null,
}

export default { theme, localization, configuration }
