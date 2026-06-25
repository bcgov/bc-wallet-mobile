import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { parseBirthdateToLocalDate } from '@/bcsc-theme/utils/birthdate'
import { HELP_URL } from '@/constants'
import { StackNavigationProp } from '@react-navigation/stack'
import moment from 'moment'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsContent } from './SettingsContent'

type MainSettingsScreenProps = {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainSettings>
}

/**
 * Settings screen for the Main stack.
 * Wraps SettingsContent with Main stack-specific navigation callbacks.
 */
export const MainSettingsScreen: React.FC<MainSettingsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { account } = useAccount()

  const onContactUs = () => {
    navigation.navigate(BCSCScreens.MainContactUs)
  }

  const onHelp = () => {
    navigation.navigate(BCSCScreens.MainWebView, {
      url: HELP_URL,
      title: t('BCSC.Screens.HelpCentre'),
    })
  }

  const onPrivacy = () => {
    navigation.navigate(BCSCScreens.MainPrivacyPolicy)
  }

  const onPressDeveloperMode = () => {
    navigation.navigate(BCSCScreens.MainDeveloper)
  }

  const onEditNickname = () => {
    navigation.navigate(BCSCScreens.EditNickname)
  }

  const onAccountDetails = () => {
    navigation.navigate(BCSCScreens.AccountDetails)
  }

  const onForgetAllPairings = () => {
    navigation.navigate(BCSCScreens.ForgetAllPairings)
  }

  const onAutoLock = () => {
    navigation.navigate(BCSCScreens.MainAutoLock)
  }

  const onAppSecurity = () => {
    navigation.navigate(BCSCScreens.MainAppSecurity)
  }

  const onChangePIN = () => {
    navigation.navigate(BCSCScreens.MainChangePIN, { isChangingExistingPIN: true })
  }

  const onResetWallet = () => {
    navigation.navigate(BCSCScreens.MainResetWalletConfirmation)
  }

  const onRemoveAccount = () => {
    navigation.navigate(BCSCScreens.MainRemoveAccountConfirmation)
  }

  const onContacts = () => {
    navigation.navigate(BCSCScreens.Contacts)
  }

  const onAddDevice = () => {
    if (account?.birthdate) {
      const birthdate = parseBirthdateToLocalDate(account.birthdate)
      const age = moment().diff(moment(birthdate), 'years')
      if (age < 12) {
        navigation.navigate(BCSCScreens.TransferAgeRestriction)
        return
      }
    }
    navigation.navigate(BCSCScreens.TransferAccountQRInformation)
  }

  const onScanMyQR = () => {
    navigation.navigate(BCSCScreens.QRCore, { screen: BCSCQRCoreScreens.Display })
  }

  return (
    <SettingsContent
      onContactUs={onContactUs}
      onHelp={onHelp}
      onPrivacy={onPrivacy}
      onPressDeveloperMode={onPressDeveloperMode}
      onEditNickname={onEditNickname}
      onAccountDetails={onAccountDetails}
      onForgetAllPairings={onForgetAllPairings}
      onAutoLock={onAutoLock}
      onAppSecurity={onAppSecurity}
      onChangePIN={onChangePIN}
      onResetWallet={onResetWallet}
      onRemoveAccount={onRemoveAccount}
      onContacts={onContacts}
      onAddDevice={onAddDevice}
      onScanMyQR={onScanMyQR}
    />
  )
}
