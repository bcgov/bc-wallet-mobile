import { matchBiometric } from '../../../../src/helpers/biometrics.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SecureApp = new BaseScreen(BCSC_TestIDs.SecureApp)
const SetupSteps = new BaseScreen(BCSC_TestIDs.SetupSteps)

describe('Biometric Authentication', () => {
  it('should select an biometric auth method on the Secure App screen', async () => {
    await SecureApp.waitFor('BiometricAuth')
    await SecureApp.tap('BiometricAuth')
  })

  it('should complete authentication', async () => {
    await matchBiometric()
    await SetupSteps.waitFor('Step1', 20_000)
  })
})
