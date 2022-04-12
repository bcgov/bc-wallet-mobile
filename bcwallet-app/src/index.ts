import {
    defaultTranslationResources,
    ConfigurationContext,
    defaultOnboardingPages as onboardingPages,
    defaultSplashScreen as splashSreen,
    defaultTerms as termsSreen
} from 'aries-bifold'
import _merge from 'lodash.merge'
import  {defaultTheme as theme} from './theme'
import en from './localization/en'
const localization = _merge({}, defaultTranslationResources, {en:{translation:en}})

const configuration: ConfigurationContext = {
    onboarding: {
      pages: onboardingPages,
    },
    splash: splashSreen,
    terms: termsSreen,
  }

export default {theme, localization, configuration}
