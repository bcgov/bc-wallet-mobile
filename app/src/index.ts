import {
    translationResources,
    ConfigurationContext,
} from 'aries-bifold'
import _merge from 'lodash.merge'
import  {defaultTheme as theme} from './theme'
import en from './localization/en'
import { pages }  from './screens/OnboardingPages'
import Terms from './screens/Terms'
import Splash from './screens/Splash'

const localization = _merge({}, translationResources, {en:{translation:en}})
const configuration: ConfigurationContext = {
    pages,
    splash: Splash,
    terms: Terms,
  }

export default {theme, localization, configuration}
