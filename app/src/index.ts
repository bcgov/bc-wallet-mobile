import {
  translationResources,
  ConfigurationContext,
  Record,
  indyLedgers,
  defaultConfiguration,
  Stacks,
  Screens,
} from '@hyperledger/aries-bifold-core'
import { BrandingOverlayType, RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import merge from 'lodash.merge'
import { ReducerAction } from 'react'
import { Linking } from 'react-native'
import { Config } from 'react-native-config'

import AddCredentialButton from './components/AddCredentialButton'
import AddCredentialSlider from './components/AddCredentialSlider'
import EmptyList from './components/EmptyList'
import HomeFooterView from './components/HomeFooterView'
import { useNotifications } from './hooks/notifications'
import en from './localization/en'
import fr from './localization/fr'
import ptBr from './localization/pt-br'
import Developer from './screens/Developer'
import { pages } from './screens/OnboardingPages'
import PersonCredential from './screens/PersonCredential'
import Preface from './screens/Preface'
import Splash from './screens/Splash'
import Terms from './screens/Terms'
import { useAttestation } from './services/attestation'
import { BCDispatchAction } from './store'
import { defaultTheme as theme } from './theme'

const localization = merge({}, translationResources, {
  en: { translation: en },
  fr: { translation: fr },
  'pt-BR': { translation: ptBr },
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selectedLedgers = indyLedgers.filter((ledger: any) => ledger.indyNamespace !== 'indicio')
const configuration: ConfigurationContext = {
  ...defaultConfiguration,
  pages,
  splash: Splash,
  terms: Terms,
  preface: Preface,
  homeFooterView: HomeFooterView,
  credentialListHeaderRight: AddCredentialButton,
  credentialListOptions: AddCredentialSlider,
  credentialEmptyList: EmptyList,
  developer: Developer,
  OCABundleResolver: new RemoteOCABundleResolver(Config.OCA_URL ?? '', {
    brandingOverlayType: BrandingOverlayType.Branding10,
  }),
  proofTemplateBaseUrl: Config.PROOF_TEMPLATE_URL,
  record: Record,
  indyLedgers: selectedLedgers,
  settings: [],
  customNotification: {
    component: PersonCredential,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  enableTours: true,
  showPreface: true,
  disableOnboardingSkip: true,
  useCustomNotifications: useNotifications,
  useAttestation: useAttestation,
  whereToUseWalletUrl: 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet#where',
  getCredentialHelpDictionary: [
    {
      // Person Credential
      credDefIds: [
        'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:PersonQA',
        '7xjfawcnyTUcduWVysLww5:3:CL:28075:PersonSIT',
        'XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV',
        'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
      ],
      action: (navigation) => {
        navigation.getParent()?.navigate(Stacks.NotificationStack, {
          screen: Screens.CustomNotification,
        })
      },
    },
    {
      // Member Card
      credDefIds: [
        '4xE68b6S5VRFrKMMG1U95M:3:CL:59232:default',
        'L6ASjmDDbDH7yPL1t2yFj9:2:member_card:1.53',
        'M6dhuFj5UwbhWkSLmvYSPc:2:member_card:1.53',
        'QEquAHkM35w4XVT3Ku5yat:2:member_card:1.53',
        'AuJrigKQGRLJajKAebTgWu:3:CL:209526:default',
      ],
      action: () => {
        Linking.openURL('https://www.lawsociety.bc.ca/lsbc/apps/members/login.cfm')
      },
    },
  ],
}

export default { theme, localization, configuration }
