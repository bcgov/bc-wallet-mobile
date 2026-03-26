import { getE2EConfig } from '../../src/e2eConfig.js'
import { acceptLocalNetworkPermissionIfPresent } from '../../src/helpers/iosPermissions.js'
import { annotate } from '../../src/helpers/sauce.js'
import { BaseScreen } from '../../src/screens/BaseScreen.js'
import { BCWallet_TestIDs } from '../../src/testIDs.js'

const Preface = new BaseScreen(BCWallet_TestIDs.Preface)
const Onboarding = new BaseScreen(BCWallet_TestIDs.Onboarding)

describe('App Launch', () => {
  const { variant } = getE2EConfig()

  it('should launch and display the Preface screen', async () => {
    await acceptLocalNetworkPermissionIfPresent()
    await annotate(`Variant: ${variant}`)
    await Preface.waitFor('IAgree')
  })

  it('should complete Preface screen navigation', async () => {
    await Preface.tap('IAgree')
    await Preface.waitFor('Continue', 20_000)
    await Preface.tap('Continue')
  })

  it('should display the Onboarding screen', async () => {
    await Onboarding.waitFor('Next')
    await Onboarding.tap('Next')
    await Onboarding.tap('Next')
    await Onboarding.tap('GetStarted')
  })
})
