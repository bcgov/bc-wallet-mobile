import { NavigatorScreenParams } from '@react-navigation/native'

export enum BCSCStacks {
  TabStack = 'BCSCTabStack',
}

export enum BCSCScreens {
  Home = 'BCSCHome',
  Services = 'BCSCServices',
  Account = 'BCSCAccount',
  Settings = 'BCSCSettings',
  ManualPairingCode = 'BCSCManualPairingCode',
  PairingConfirmation = 'BCSCPairingConfirmation',
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
