import { translationResources } from '@hyperledger/aries-bifold-core'
import merge from 'lodash.merge'

import en from './localization/en'
import fr from './localization/fr'
import ptBr from './localization/pt-br'
import { defaultTheme as theme } from './theme'

const localization = merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
  'pt-BR': { translation: ptBr },
})

export default { theme, localization }
