import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCSCEvent } from '@/bcsc-theme/utils/id-token'
import {
  getPendingDeviceCodeExpiry,
  isVerifiedFromNativeStorage,
  VerificationSessionExpiredSystemCheck,
} from '@/services/system-checks/VerificationSessionExpiredSystemCheck'
import { MockLogger } from '@bifold/core'
import { getAuthorizationRequest, getCredential, getToken } from 'react-native-bcsc-core'

const makeUtils = () => ({
  dispatch: jest.fn(),
  translation: jest.fn() as any,
  logger: new MockLogger(),
})

describe('VerificationSessionExpiredSystemCheck', () => {
  const now = new Date('2026-06-16T00:00:00.000Z')

  describe('runCheck', () => {
    it('returns true (and skips the expiry lookup) when the user is already verified', async () => {
      const getExpiry = jest.fn().mockResolvedValue(new Date(now.getTime() - 1000))
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, true, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(true)
      expect(getExpiry).not.toHaveBeenCalled()
    })

    it('returns true when there is no pending device_code', async () => {
      const getExpiry = jest.fn().mockResolvedValue(null)
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, false, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(true)
    })

    it('returns true when the device_code has not yet expired', async () => {
      const getExpiry = jest.fn().mockResolvedValue(new Date(now.getTime() + 60_000))
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, false, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(true)
    })

    it('returns false when an unverified user holds an expired device_code', async () => {
      const getExpiry = jest.fn().mockResolvedValue(new Date(now.getTime() - 60_000))
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, false, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(false)
    })

    it('returns true (non-blocking) when the expiry lookup throws', async () => {
      const getExpiry = jest.fn().mockRejectedValue(new Error('native read failed'))
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, false, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(true)
    })
  })

  describe('onFail', () => {
    it('navigates to the VerificationSessionExpired modal', () => {
      const navigate = jest.fn()
      const check = new VerificationSessionExpiredSystemCheck(
        jest.fn().mockResolvedValue(null),
        false,
        { navigate } as any,
        makeUtils(),
        now
      )

      check.onFail()

      expect(navigate).toHaveBeenCalledWith(BCSCModals.VerificationSessionExpired)
    })
  })
})

describe('getPendingDeviceCodeExpiry', () => {
  beforeEach(() => {
    jest.mocked(getAuthorizationRequest).mockReset()
  })

  it('returns null when there is no authorization request', async () => {
    jest.mocked(getAuthorizationRequest).mockResolvedValue(null)

    await expect(getPendingDeviceCodeExpiry()).resolves.toBeNull()
  })

  it('returns null when the authorization request has no device code', async () => {
    jest.mocked(getAuthorizationRequest).mockResolvedValue({ expiry: 1_700_000_000 } as any)

    await expect(getPendingDeviceCodeExpiry()).resolves.toBeNull()
  })

  it('returns null when the authorization request has no expiry', async () => {
    jest.mocked(getAuthorizationRequest).mockResolvedValue({ deviceCode: 'device-code' } as any)

    await expect(getPendingDeviceCodeExpiry()).resolves.toBeNull()
  })

  it('converts the Unix-seconds expiry to a Date when a device code is present', async () => {
    jest.mocked(getAuthorizationRequest).mockResolvedValue({ deviceCode: 'device-code', expiry: 1_700_000_000 } as any)

    await expect(getPendingDeviceCodeExpiry()).resolves.toEqual(new Date(1_700_000_000 * 1000))
  })
})

describe('isVerifiedFromNativeStorage', () => {
  beforeEach(() => {
    jest.mocked(getCredential).mockReset()
    jest.mocked(getToken).mockReset()
  })

  it('returns true when a verified credential exists', async () => {
    jest.mocked(getCredential).mockResolvedValue({} as any) // non-null, no cancel/expire event => VERIFIED
    jest.mocked(getToken).mockResolvedValue(null)

    await expect(isVerifiedFromNativeStorage()).resolves.toBe(true)
  })

  it('returns true when unverified but a non-deactivated refresh token is present', async () => {
    jest.mocked(getCredential).mockResolvedValue(null) // => UNVERIFIED
    jest.mocked(getToken).mockResolvedValue({ token: 'refresh-token' } as any)

    await expect(isVerifiedFromNativeStorage()).resolves.toBe(true)
  })

  it('returns false when there is no credential and no refresh token', async () => {
    jest.mocked(getCredential).mockResolvedValue(null)
    jest.mocked(getToken).mockResolvedValue(null)

    await expect(isVerifiedFromNativeStorage()).resolves.toBe(false)
  })

  it('returns false when the credential is deactivated even if a refresh token is present', async () => {
    jest.mocked(getCredential).mockResolvedValue({ bcscEvent: BCSCEvent.Cancel } as any) // => DEACTIVATED
    jest.mocked(getToken).mockResolvedValue({ token: 'refresh-token' } as any)

    await expect(isVerifiedFromNativeStorage()).resolves.toBe(false)
  })
})
