import { translationResources } from '@bifold/core'
import merge from 'lodash.merge'

import en from './en'
import fr from './fr'
import ptBr from './pt-br'

export const localization = merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
  'pt-BR': { translation: ptBr },
})
