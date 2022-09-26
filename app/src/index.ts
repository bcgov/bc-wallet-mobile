import { translationResources, ConfigurationContext } from 'aries-bifold'
import _merge from 'lodash.merge'

import UseBiometry from '../../bifold/core/App/screens/UseBiometry'

import branding from './assets/branding/credential-branding'
import BCIDView from './components/BCIDView'
import en from './localization/en'
import { pages } from './screens/OnboardingPages'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { defaultTheme as theme } from './theme'

const localization = _merge({}, translationResources, {
  en: { translation: en },
})
const configuration: ConfigurationContext = {
  pages,
  splash: Splash,
  terms: Terms,
  homeContentView: BCIDView,
  OCABundle: branding,
  useBiometry: UseBiometry,
}

export default { theme, localization, configuration }
