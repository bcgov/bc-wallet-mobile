import { translationResources, ConfigurationContext, types, Record } from 'aries-bifold'
import { Bundles } from 'aries-bifold/lib/typescript/App/types/oca'
import _merge from 'lodash.merge'

import UseBiometry from '../../bifold/core/App/screens/UseBiometry'

import BCIDView from './components/BCIDView'
import en from './localization/en'
import fr from './localization/fr'
import { pages } from './screens/OnboardingPages'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { defaultTheme as theme } from './theme'
const localization = _merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
})

const configuration: ConfigurationContext = {
  pages,
  splash: Splash,
  terms: Terms,
  homeContentView: BCIDView,
  OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./assets/branding/oca-bundle-qc.json') as Bundles
  ),
  useBiometry: UseBiometry,
  record: Record,
}

export default { theme, localization, configuration }
