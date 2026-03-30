import {
  acceptBiometricPermissionIfPresent,
  canSimulateBiometric,
  enrollBiometric,
  matchBiometric,
} from '../../../src/helpers/biometrics.js'
import { BaseScreen } from '../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../src/testIDs.js'

const SecureApp = new BaseScreen(BCSC_TestIDs.SecureApp)
const CreatePIN = new BaseScreen(BCSC_TestIDs.CreatePIN)
const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)

describe('Secure App Authentication', () => {
  it('should select an auth method on the Secure App screen', async () => {
    if (canSimulateBiometric()) {
      await enrollBiometric()
      await SecureApp.waitFor('BiometricAuth')
      await SecureApp.tap('BiometricAuth')
      await acceptBiometricPermissionIfPresent()
      await matchBiometric()
    } else {
      await SecureApp.waitFor('PinAuth')
      await SecureApp.tap('PinAuth')
    }
  })

  it('should complete authentication', async () => {
    if (canSimulateBiometric()) {
      await SetupSteps.waitFor('Step1', 20_000)
    } else {
      await CreatePIN.waitFor('PINInput1')
      await CreatePIN.tap('PINInput1VisibilityButton')
      await CreatePIN.tap('PINInput2VisibilityButton')
      await CreatePIN.type('PINInput1', '123456')
      await CreatePIN.type('PINInput2', '123456')
      await CreatePIN.tap('IUnderstand')
      await CreatePIN.tap('Continue')
    }
  })
})
