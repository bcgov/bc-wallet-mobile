import {
  acceptPrivacy,
  acceptTerms,
  advanceNewSetup,
  chooseEnterManually,
  completeApprovedVerification,
  completeTutorial,
  createPin,
  enableNotifications,
  enterBirthdate,
  enterNickname,
  enterSerial,
  readConfirmationCode,
  selectCombinedCard,
  selectInPerson,
  tapAddCard,
  tapChoosePin,
  tapStep,
} from '../../../src/flows/onboarding-v3.js'
import { approveInPersonRequest } from '../../../src/helpers/approval.js'
import { annotate } from '../../../src/helpers/sauce.js'
import { migrationContext } from './migration-context.js'

const testUser = migrationContext.user

/** One checkpoint per v3 screen; the driving lives in `flows/onboarding-v3.ts`. */
describe('Upgrade from v3: setting up on the v3 release', () => {
  it('taps the Add Card / Setup button', async () => {
    await annotate('Migration: V3 onboarding')
    await tapAddCard()
  })

  it('completes the tutorial carousel', async () => {
    await completeTutorial()
  })

  // this is the one that it gets stuck on
  it('advances past the "New setup" intro page', async () => {
    await advanceNewSetup()
  })

  it('enables notifications', async () => {
    await enableNotifications()
  })

  it('taps Step 1', async () => {
    await tapStep(1)
  })

  it('accepts the privacy policy', async () => {
    await acceptPrivacy()
  })

  it('accepts the terms of use', async () => {
    await acceptTerms()
  })

  it('enters an account nickname', async () => {
    await enterNickname(testUser.username)
  })

  it('taps Choose a PIN', async () => {
    await tapChoosePin()
  })

  it('creates a PIN', async () => {
    await createPin(migrationContext.pin)
  })

  it('taps Step 2', async () => {
    await tapStep(2)
  })

  it('selects the combined card type', async () => {
    await selectCombinedCard()
  })

  it('chooses Enter Manually', async () => {
    await chooseEnterManually()
  })

  it('enters the card serial number', async () => {
    await enterSerial(testUser.cardSerial)
  })

  it('enters the birthdate', async () => {
    await enterBirthdate(testUser.dob)
  })

  it('taps Step 5', async () => {
    await tapStep(5)
  })

  it('selects in-person verification', async () => {
    await selectInPerson()
  })

  it('reads the confirmation code and approves it in the IDCheck portal', async () => {
    const confirmationCode = await readConfirmationCode()
    console.log(`[migration] V3 confirmation code: "${confirmationCode}"`)
    await approveInPersonRequest(confirmationCode, {
      flow: 'photo',
      cardSerialNumber: testUser.cardSerial,
      cardBirthdate: testUser.dob,
    })
  })

  it('completes the approved verification and dismisses the "You\'re all set" screen', async () => {
    await completeApprovedVerification()
    await annotate('Migration: V3 onboarding + verification complete')
  })
})
