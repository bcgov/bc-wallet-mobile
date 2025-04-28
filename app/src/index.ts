import { translationResources } from '@bifold/core'
import merge from 'lodash.merge'

import en from './localization/en'
import fr from './localization/fr'
import ptBr from './localization/pt-br'
import { defaultTheme as theme } from './theme'
import { bcscTheme } from './modules/bcsc/bcscTheme'

const localization = merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
  'pt-BR': { translation: ptBr },
})

export default { theme, localization, bcscTheme }
