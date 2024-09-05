import { translationResources } from '@hyperledger/aries-bifold-core'
import merge from 'lodash.merge'

import en from './localization/en'
import fr from './localization/fr'
import { defaultTheme as theme } from './theme'

const localization = merge(
  {},
  { en: translationResources.en, fr: translationResources.fr },
  {
    en: { translation: en },
    fr: { translation: fr },
  }
)

export default { theme, localization }
