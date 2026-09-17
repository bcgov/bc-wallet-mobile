import { AppEventCode } from '@/events/appEventCode'
import { NonBCSCUserMetadata } from '@/store'
import { MockLogger } from '@bifold/core'
import { TFunction } from 'i18next'
import { InvalidStoredMetadataSystemCheck, StoredMetadataState } from './InvalidStoredMetadataSystemCheck'

const makeUtils = () => ({
  dispatch: jest.fn(),
  translation: ((key: string) => key) as unknown as TFunction,
  logger: new MockLogger(),
})

const INVALID_NAME: NonBCSCUserMetadata = { name: { first: 'Jane', middle: 'Ann<3', last: 'Doe' } }

const VALID_METADATA: NonBCSCUserMetadata = {
  name: { first: 'Jane', middle: 'Ann', last: "O'Brien-Smith" },
  address: {
    streetAddress: '123 Main St',
    postalCode: 'V8V 1A1',
    city: 'Victoria',
    province: 'BC',
    country: 'CA',
  },
}

/** Builds a check whose state accessor reads from a mutable object, so tests can change it mid-flow. */
const makeCheck = (state: StoredMetadataState) => {
  const current = { ...state }
  const emitAlert = jest.fn()
  const restartVerification = jest.fn()
  const check = new InvalidStoredMetadataSystemCheck(() => current, emitAlert, restartVerification, makeUtils())

  return {
    check,
    emitAlert,
    restartVerification,
    setState: (next: StoredMetadataState) => Object.assign(current, next),
  }
}

describe('InvalidStoredMetadataSystemCheck', () => {
  describe('runCheck', () => {
    it('passes when there is no stored metadata', () => {
      const { check } = makeCheck({ isVerified: false, userMetadata: undefined })

      expect(check.runCheck()).toBe(true)
    })

    it('passes when the stored name and address are valid', () => {
      const { check } = makeCheck({ isVerified: false, userMetadata: VALID_METADATA })

      expect(check.runCheck()).toBe(true)
    })

    // RootStack mounts VerifyStack for a verified user when sessionRecoveryRequired is set, and
    // hydration rebuilds userMetadata regardless of verified status — so the scope alone is not a
    // sufficient gate for a destructive action.
    it('passes for a verified account even when the stored metadata is invalid', () => {
      const { check } = makeCheck({ isVerified: true, userMetadata: INVALID_NAME })

      expect(check.runCheck()).toBe(true)
    })

    it('fails when an unverified account has a stored middle name the entry form now rejects', () => {
      const { check } = makeCheck({ isVerified: false, userMetadata: INVALID_NAME })

      expect(check.runCheck()).toBe(false)
    })

    it('fails when an unverified account has a stored postal code the entry form now rejects', () => {
      const { check } = makeCheck({
        isVerified: false,
        userMetadata: {
          address: {
            streetAddress: '123 Main St',
            postalCode: 'not-a-postal-code',
            city: 'Victoria',
            province: 'BC',
            country: 'CA',
          },
        },
      })

      expect(check.runCheck()).toBe(false)
    })
  })

  describe('onFail', () => {
    it('emits a single-action alert that restarts verification when pressed', () => {
      const { check, emitAlert, restartVerification } = makeCheck({ isVerified: false, userMetadata: INVALID_NAME })

      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith(
        'Alerts.InvalidStoredMetadata.Title',
        'Alerts.InvalidStoredMetadata.Description',
        {
          event: AppEventCode.INVALID_STORED_METADATA,
          actions: [{ text: 'Alerts.InvalidStoredMetadata.Action1', onPress: expect.any(Function) }],
        }
      )

      emitAlert.mock.calls[0][2].actions[0].onPress()

      expect(restartVerification).toHaveBeenCalledTimes(1)
    })

    it('does not reset when verification completed while the alert was open', () => {
      const { check, emitAlert, restartVerification, setState } = makeCheck({
        isVerified: false,
        userMetadata: INVALID_NAME,
      })

      check.onFail()
      setState({ isVerified: true, userMetadata: INVALID_NAME })
      emitAlert.mock.calls[0][2].actions[0].onPress()

      expect(restartVerification).not.toHaveBeenCalled()
    })

    it('does not reset when the metadata was replaced with a valid value while the alert was open', () => {
      const { check, emitAlert, restartVerification, setState } = makeCheck({
        isVerified: false,
        userMetadata: INVALID_NAME,
      })

      check.onFail()
      setState({ isVerified: false, userMetadata: VALID_METADATA })
      emitAlert.mock.calls[0][2].actions[0].onPress()

      expect(restartVerification).not.toHaveBeenCalled()
    })
  })
})
