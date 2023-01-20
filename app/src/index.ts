import {
  translationResources,
  ConfigurationContext,
  types,
  Record,
  indyLedgers,
  defaultConfiguration,
} from 'aries-bifold'
import { Bundles } from 'aries-bifold/lib/typescript/App/types/oca'
import merge from 'lodash.merge'

import bundles from './assets/branding/credential-branding'
import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import en from './localization/en'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import PersonCredentialScreen from './screens/PersonCredential'
import { defaultTheme as theme } from './theme'
import { useNotifications } from './hooks/notifications'
import { ReducerAction } from 'react'
import { BCDispatchAction } from './store'

const localization = merge({}, translationResources, {
  en: { translation: en },
})

const selectedLedgers = indyLedgers.filter((item) => !item.id.startsWith('Indicio'))
const configuration: ConfigurationContext = {
  ...defaultConfiguration,
  pages,
  splash: Splash,
  terms: Terms,
  credentialListHeaderRight: AddCredentialButton,
  credentialListOptions: AddCredentialSlider,
  credentialEmptyList: EmptyList,
  developer: Developer,
  OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(bundles as unknown as Bundles),
  record: Record,
  indyLedgers: selectedLedgers,
  settings: [],
  customNotification: {
    component: PersonCredentialScreen,
    onCloseAction: (dispatch?: React.Dispatch<ReducerAction<any>>) => {
      if (dispatch) {
        dispatch({
          type: BCDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED,
          payload: [{personCredentialOfferDismissed: true}]
        })
      }
    },
    pageTitle: "PersonCredential.PageTitle",
    title: "PersonCredentialNotification.Title",
    description: "PersonCredentialNotification.Description",
    buttonTitle: "PersonCredentialNotification.ButtonTitle"
  },
  useCustomNotifications: useNotifications
}

export default { theme, localization, configuration }
