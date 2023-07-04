import {
  translationResources,
  ConfigurationContext,
  types,
  Record,
  indyLedgers,
  defaultConfiguration,
} from 'aries-bifold'
import merge from 'lodash.merge'
import { ReducerAction } from 'react'

import bundle from './assets/branding/QC-credential-branding'
import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import { PINValidationRules } from './constants'
import { useNotifications } from './hooks/notifications'
import en from './localization/en'
import fr from './localization/fr'
import TermsStack from './navigators/TermsStack'
import { proofRequestTemplates } from './request-templates'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import PersonCredential from './screens/PersonCredential'
import Splash from './screens/Splash'
import { BCDispatchAction } from './store'
import { defaultTheme as theme } from './theme'

const localization = merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
})
const selectedLedgers = indyLedgers.filter((ledger) => ledger.indyNamespace !== 'indicio')
const configuration: ConfigurationContext = {
  ...defaultConfiguration,
  pages,
  splash: Splash,
  terms: TermsStack,
  credentialListHeaderRight: AddCredentialButton,
  credentialListOptions: AddCredentialSlider,
  credentialEmptyList: EmptyList,
  developer: Developer,
  OCABundleResolver: new types.oca.OCABundleResolver(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    bundle as unknown as types.oca.Bundles,
    { cardOverlayType: types.oca.CardOverlayType.CardLayout11 }
  ),
  record: Record,
  PINSecurity: { rules: PINValidationRules, displayHelper: true },
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
  proofRequestTemplates,
  enableTours: true,
}

export default { theme, localization, configuration }
