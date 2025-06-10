import { NavigatorScreenParams } from '@react-navigation/native'

export enum BCSCStacks {
  TabStack = 'BCSCTabStack',
}

export enum BCSCScreens {
  Home = 'BCSCHome',
  Services = 'BCSCServices',
  Account = 'BCSCAccount',
  Settings = 'BCSCSettings',
  Loading = 'Loading',
  ManualPairingCode = 'BCSCManualPairingCode',
  PairingConfirmation = 'BCSCPairingConfirmation',
  IdentitySelection = 'BCSCIdentitySelection',
  IdentityDescription = 'BCSCIdentityDescription',
  EnterEvidence = 'BCSCEnterEvidence',
  EnterBirthdate = 'BCSCEnterBirthdate',
  SelectVerificationMethod = 'BCSCSelectVerificationMethod',
  VerifyInPersonCode = 'BCSCVerifyInPersonCode'

}

export type BCSCTabStackParams = {
  [BCSCScreens.Home]: undefined
  [BCSCScreens.Services]: undefined
  [BCSCScreens.Account]: undefined
  [BCSCScreens.Settings]: undefined
}

export type BCSCRootStackParams = {
  [BCSCStacks.TabStack]: NavigatorScreenParams<BCSCTabStackParams>
  [BCSCScreens.ManualPairingCode]: undefined
  [BCSCScreens.PairingConfirmation]: { serviceName: string; serviceId: string }
}

export type BCSCVerifyIdentityStackParamList = {
  [BCSCScreens.IdentitySelection]: { stepIndex: number } | undefined;
  [BCSCScreens.IdentityDescription]: { stepIndex: number } | undefined;
  [BCSCScreens.EnterEvidence]: { stepIndex: number } | undefined;
  [BCSCScreens.EnterBirthdate]: { stepIndex: number } | undefined;
  [BCSCScreens.SelectVerificationMethod]: { stepIndex: number } | undefined;
  [BCSCScreens.VerifyInPersonCode]: { stepIndex: number } | undefined;
  [BCSCScreens.Loading]: { stepIndex: number } | undefined;
}