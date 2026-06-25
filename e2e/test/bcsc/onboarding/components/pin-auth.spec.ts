import { TEST_PIN } from '../../../../src/constants.js'
import { BaseScreen } from '../../../../src/screens/BaseScreen.js'
import { BCSC_TestIDs } from '../../../../src/testIDs.js'

const SecureApp = new BaseScreen(BCSC_TestIDs.SecureApp)
const CreatePIN = new BaseScreen(BCSC_TestIDs.CreatePIN)

describe('PIN Authentication', () => {
  it('should select Pin Auth on the Secure App screen', async () => {
    await SecureApp.waitFor('PinAuth')
    await SecureApp.tap('PinAuth')
  })

  it('should create a PIN', async () => {
    await CreatePIN.waitFor('PINInput1')
    await CreatePIN.type('PINInput1', TEST_PIN)
    await CreatePIN.type('PINInput2', TEST_PIN)
    await CreatePIN.tap('IUnderstand')
    await CreatePIN.tap('Continue')
  })
})
