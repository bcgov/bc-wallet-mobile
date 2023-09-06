import { BrandingOverlayType, RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import { translationResources, ConfigurationContext, Record, indyLedgers, defaultConfiguration } from 'aries-bifold'
import merge from 'lodash.merge'
import { ReducerAction } from 'react'
import Config from 'react-native-config'

import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import HomeFooterView from './components/HomeFooterView'
import { useNotifications } from './hooks/notifications'
import en from './localization/en'
import fr from './localization/fr'
import ptBr from './localization/pt-br'
import { useProofRequestTemplates } from './request-templates'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import PersonCredential from './screens/PersonCredential'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { BCDispatchAction } from './store'
import { defaultTheme as theme } from './theme'

const localization = merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
  'pt-BR': { translation: ptBr },
})
const selectedLedgers = indyLedgers.filter((ledger) => ledger.indyNamespace !== 'indicio')
const configuration: ConfigurationContext = {
  ...defaultConfiguration,
  pages,
  splash: Splash,
  terms: Terms,
  homeFooterView: HomeFooterView,
  credentialListHeaderRight: AddCredentialButton,
  credentialListOptions: AddCredentialSlider,
  credentialEmptyList: EmptyList,
  developer: Developer,
  OCABundleResolver: new RemoteOCABundleResolver(Config.OCA_URL ?? '', {
    brandingOverlayType: BrandingOverlayType.Branding10,
  }),
  record: Record,
  indyLedgers: selectedLedgers,
  settings: [],
  customNotification: {
    component: PersonCredential,
    onCloseAction: (dispatch?: React.Dispatch<ReducerAction<any>>) => {
      if (dispatch) {
        dispatch({
          type: BCDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED,
          payload: [{ personCredentialOfferDismissed: true }],
        })
      }
    },
    pageTitle: 'PersonCredential.PageTitle',
    title: 'PersonCredentialNotification.Title',
    description: 'PersonCredentialNotification.Description',
    buttonTitle: 'PersonCredentialNotification.ButtonTitle',
  },
  useCustomNotifications: useNotifications,
  proofRequestTemplates: useProofRequestTemplates,
  enableTours: true,
}

export default { theme, localization, configuration }
