import { TEST_PIN } from '../../../src/constants.js'
import { acceptSystemAlert, tapResetAppConfirm } from '../../../src/helpers/alerts.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const TransferInformation = new BaseScreen(BCSC_TestIDs.TransferInformation)
const Nickname = new BaseScreen(BCSC_TestIDs.Nickname)
const TransferInstructions = new BaseScreen(BCSC_TestIDs.TransferInstructions)
const TransferQRScanner = new BaseScreen(BCSC_TestIDs.TransferQRScanner)
const Settings = new BaseScreen(BCSC_TestIDs.Settings)
const AccountSetup = new BaseScreen(BCSC_TestIDs.AccountSetup)
const PrivacyPolicy = new BaseScreen(BCSC_TestIDs.PrivacyPolicy)
const OptInAnalytics = new BaseScreen(BCSC_TestIDs.OptInAnalytics)
const TermsOfUse = new BaseScreen(BCSC_TestIDs.TermsOfUse)
const Notifications = new BaseScreen(BCSC_TestIDs.Notifications)
const SecureApp = new BaseScreen(BCSC_TestIDs.SecureApp)
const CreatePIN = new BaseScreen(BCSC_TestIDs.CreatePIN)
const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)

describe('Transfer Account Detour', () => {
  it('should detour through Transfer Account all the way to Setup Steps', async () => {
    await AccountSetup.tap('TransferAccount')
    await TransferInformation.waitFor('TransferAccountButton')
    await TransferInformation.tap('TransferAccountButton')
    await PrivacyPolicy.waitFor('Continue')
    await PrivacyPolicy.tap('Continue')
    await OptInAnalytics.waitFor('Accept')
    await OptInAnalytics.tap('Accept')
    await TermsOfUse.waitFor('AcceptAndContinue')
    await TermsOfUse.tapWhenEnabled('AcceptAndContinue')

    await Notifications.waitFor('Continue')
    await Notifications.tap('Continue')
    await acceptSystemAlert()
    await SecureApp.waitFor('PinAuth')
    await SecureApp.tap('PinAuth')
    await CreatePIN.waitFor('PINInput1')
    await CreatePIN.type('PINInput1', TEST_PIN)
    await CreatePIN.type('PINInput2', TEST_PIN)
    await CreatePIN.tap('IUnderstand')
    await CreatePIN.tap('Continue')
    await SetupSteps.waitFor('Step1')
    await SetupSteps.tap('Step1')
    await Nickname.waitFor('AccountNicknameInput')
  })

  it('should fill in the Nickname and continue to Setup Steps', async () => {
    if (driver.isAndroid) {
      await Nickname.tap('AccountNicknameInput')
      await Nickname.type('AccountNicknameInput', 'My Test Account', { tapFirst: true, characterByCharacter: false })
    } else {
      await Nickname.tap('AccountNicknamePressable')
      await Nickname.type('AccountNicknamePressable', 'My Test Account', { tapFirst: true })
    }
    await Nickname.dismissKeyboard()
    await Nickname.tap('SaveAndContinue')
    await SetupSteps.waitFor('Step2')
  })

  it('should click Step 2 and open the Transfer Account screen', async () => {
    await SetupSteps.tap('Step2')
    await TransferInstructions.waitFor('ScanQRCode')
    await TransferInstructions.tap('ScanQRCode')
    await acceptSystemAlert()
    await TransferQRScanner.waitFor('Back')
    await TransferQRScanner.tap('Back')
    await TransferInstructions.waitFor('Back')
    await TransferInstructions.tap('Back')
  })

  it('should reset fully back to beginning of onboarding after backing out of Transfer Account', async () => {
    await SetupSteps.waitFor('SettingsMenuButton')
    await SetupSteps.tap('SettingsMenuButton')
    await Settings.waitFor('RemoveAccount')
    await Settings.tap('RemoveAccount')

    await tapResetAppConfirm()
  })
})
