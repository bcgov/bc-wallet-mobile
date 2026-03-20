import AccountE2EScreen from './account/Account.e2e.js'
import AccountExpiredE2EScreen from './account/expired/AccountExpired.e2e.js'
import AccountRenewalFinalWarningE2EScreen from './account/expired/AccountRenewalFinalWarning.e2e.js'
import AccountRenewalFirstWarningE2EScreen from './account/expired/AccountRenewalFirstWarning.e2e.js'
import AccountRenewalInformationE2EScreen from './account/expired/AccountRenewalInformation.e2e.js'
import RemoveAccountConfirmationE2EScreen from './account/RemoveAccountConfirmation.e2e.js'
import TransferAccountQRDisplayE2EScreen from './account/transfer/TransferAccountQRDisplay.e2e.js'
import TransferAccountQRInformationE2EScreen from './account/transfer/TransferAccountQRInformation.e2e.js'
import TransferAccountSuccessE2EScreen from './account/transfer/TransferAccountSuccess.e2e.js'
import HomeE2EScreen from './home/Home.e2e.js'
import ManualPairingCodeE2EScreen from './home/ManualPairingCode.e2e.js'
import ServiceLoginE2EScreen from './home/ServiceLogin.e2e.js'
import TabBarE2EScreen from './home/TabBar.e2e.js'
import SystemModalE2EScreen from './modal/SystemModal.e2e.js'
import WebViewE2EScreen from './modal/WebView.e2e.js'
import PairingConfirmationE2EScreen from './services/PairingConfirmation.e2e.js'
import ServicesE2EScreen from './services/Services.e2e.js'
import AutoLockE2EScreen from './settings/AutoLock.e2e.js'
import EditNicknameE2EScreen from './settings/EditNickname.e2e.js'
import ForgetAllPairingsE2EScreen from './settings/ForgetAllPairings.e2e.js'
import SettingsE2EScreen from './settings/Settings.e2e.js'

const screens = {
  account: {
    AccountE2EScreen,
    RemoveAccountConfirmationE2EScreen,
    expired: {
      AccountExpiredE2EScreen,
      AccountRenewalFinalWarningE2EScreen,
      AccountRenewalFirstWarningE2EScreen,
      AccountRenewalInformationE2EScreen,
    },
    transfer: {
      TransferAccountQRDisplayE2EScreen,
      TransferAccountQRInformationE2EScreen,
      TransferAccountSuccessE2EScreen,
    },
  },
  home: {
    HomeE2EScreen,
    ManualPairingCodeE2EScreen,
    ServiceLoginE2EScreen,
    TabBarE2EScreen,
  },
  modal: {
    SystemModalE2EScreen,
    WebViewE2EScreen,
  },
  services: {
    PairingConfirmationE2EScreen,
    ServicesE2EScreen,
  },
  settings: {
    AutoLockE2EScreen,
    EditNicknameE2EScreen,
    ForgetAllPairingsE2EScreen,
    SettingsE2EScreen,
  },
} as const

export default screens

export {
  AccountE2EScreen,
  AccountExpiredE2EScreen,
  AccountRenewalFinalWarningE2EScreen,
  AccountRenewalFirstWarningE2EScreen,
  AccountRenewalInformationE2EScreen,
  AutoLockE2EScreen,
  EditNicknameE2EScreen,
  ForgetAllPairingsE2EScreen,
  HomeE2EScreen,
  ManualPairingCodeE2EScreen,
  PairingConfirmationE2EScreen,
  RemoveAccountConfirmationE2EScreen,
  ServiceLoginE2EScreen,
  ServicesE2EScreen,
  SettingsE2EScreen,
  SystemModalE2EScreen,
  TabBarE2EScreen,
  TransferAccountQRDisplayE2EScreen,
  TransferAccountQRInformationE2EScreen,
  TransferAccountSuccessE2EScreen,
  WebViewE2EScreen,
}
