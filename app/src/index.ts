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

import BCIDView from './components/BCIDView'
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
  homeContentView: BCIDView,
  OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./assets/branding/oca-bundle-qc.json') as Bundles
  ),
  useBiometry: UseBiometry,
  developer: Developer,
  record: Record,
  indyLedgers: selectedLedgers,
  settings: [],
}

export default { theme, localization, configuration }
