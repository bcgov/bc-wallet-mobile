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

import bundles from './assets/branding/credential-branding'
import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import { useNotifications } from './hooks/notifications'
import en from './localization/en'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import PersonCredentialScreen from './screens/PersonCredential'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { BCDispatchAction } from './store'
import { defaultTheme as theme } from './theme'

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
  OCABundleResolver: new types.oca.OCABundleResolver(bundles as unknown as types.oca.Bundles),
  record: Record,
  indyLedgers: selectedLedgers,
  settings: [],
  customNotification: {
    component: PersonCredentialScreen,
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
}

export default { theme, localization, configuration }
