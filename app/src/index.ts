import { translationResources, ConfigurationContext, types, Record } from 'aries-bifold'
import { Bundles } from 'aries-bifold/lib/typescript/App/types/oca'
import _merge from 'lodash.merge'

import UseBiometry from '../../bifold/core/App/screens/UseBiometry'

import bundles from './assets/branding/credential-branding'
import BCIDView from './components/BCIDView'
import en from './localization/en'
import fr from './localization/fr';
import { pages } from './screens/OnboardingPages'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { defaultTheme as theme } from './theme'
const localization = _merge({}, translationResources, {
    en: {translation: en},
    fr: {translation: fr}
})
const configuration: ConfigurationContext = {
  pages,
  splash: Splash,
  terms: Terms,
  homeContentView: BCIDView,
  OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(bundles as unknown as Bundles),
  useBiometry: UseBiometry,
  record: Record,
}

export default { theme, localization, configuration }
