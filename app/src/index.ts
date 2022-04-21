import {
    defaultTranslationResources,
    ConfigurationContext,
    defaultSplashScreen as splashScreen,
} from 'aries-bifold'
import _merge from 'lodash.merge'
import  {defaultTheme as theme} from './theme'
import en from './localization/en'
import { pages as onboardingPages } from './screens/OnboardingPages'
import Terms from './screens/Terms'

const localization = _merge({}, defaultTranslationResources, {en:{translation:en}})
const configuration: ConfigurationContext = {
    onboarding: {
      pages: onboardingPages,
    },
    splash: splashScreen,
    terms: Terms,
  }

export default {theme, localization, configuration}
