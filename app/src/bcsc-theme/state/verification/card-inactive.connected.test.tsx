import { BCSCAccountProvider } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { BCSCStoreSeed, nativeCredential } from '@/bcsc-theme/storage/testing'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { UNEXPIRED_JWT } from '@/bcsc-theme/utils/__fixtures__/jwt'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { runSystemChecks } from '@/services/system-checks/system-checks'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import moment from 'moment'
import React from 'react'
import { AppState } from 'react-native'
import { HomeNoticeType } from '../home/home-notice'
import { useHomeNotice } from '../home/useHomeNotice'
import { useVerificationState } from './useVerificationState'

// Real provider, hooks, store and system check: only the user API and the navigator are mocked
jest.unmock('@/bcsc-theme/contexts/BCSCAccountContext')

const mockGetUserMetadata = jest.fn()

jest.mock('@/bcsc-theme/services/hooks/useUserService', () => ({
  useUserService: jest.fn(() => ({
    getUserMetadata: mockGetUserMetadata,
  })),
}))

jest.mock('@/services/notifications/verificationReminders', () => ({
  scheduleVerificationReminders: jest.fn(),
  cancelVerificationReminders: jest.fn(),
}))

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: {
    isReady: () => true,
    getCurrentRoute: () => ({ name: 'Home' }),
  },
}))

const userData = () => ({
  user: {
    sub: 'sub-123',
    given_names: 'Steve John',
    family_name: 'Brule',
    card_expiry: moment().add(100, 'days').format('MMMM D, YYYY'),
  },
  picture: 'file:///photo.jpg',
})

const idToken = (event: BCSCEvent, reason: BCSCReason): IdToken =>
  ({
    sub: 'test-sub',
    family_name: 'Test',
    given_name: 'User',
    bcsc_card_type: 'Combined',
    bcsc_event: event,
    bcsc_reason: reason,
    bcsc_status_date: 1234567890,
    bcsc_devices_count: 1,
    bcsc_max_devices: 5,
  }) as unknown as IdToken

const EXPIRE_TOKEN = idToken(BCSCEvent.Expire, BCSCReason.ExpiredBySystem)
const CANCEL_TOKEN = idToken(BCSCEvent.Cancel, BCSCReason.Cancel)

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

// A launched, unlocked device: the given stored state, with the signed-in session hydrated
const renderDevice = async ({ session, ...seed }: BCSCStoreSeed) => {
  const bcscState: BCSCStoreSeed = { ...seed, session: { isHydrated: true, ...session } }
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BasicAppContext bcscState={bcscState}>
      <BCSCAccountProvider>{children}</BCSCAccountProvider>
    </BasicAppContext>
  )

  const { result } = renderHook(
    () => ({
      notice: useHomeNotice(),
      verification: useVerificationState(),
      secure: useSecureActions(),
    }),
    { wrapper }
  )
  // Let the account load the provider starts on mount settle
  await act(async () => {})
  return result
}

type Device = Awaited<ReturnType<typeof renderDevice>>

const dataOnly = <T extends object>(slice: T): Partial<T> =>
  Object.fromEntries(Object.entries(slice).filter(([, value]) => typeof value !== 'function')) as Partial<T>

// What a restart reads back: the persisted slices as they now stand; the memory-only session starts over
const persistedState = (): BCSCStoreSeed => ({
  app: dataOnly(getBCSCState().app),
  account: dataOnly(getBCSCState().account),
})

/** Runs the real account-change check against the device's store, as the main stack does. */
const runAccountChangeCheck = async (device: Device, token: IdToken, navigate = jest.fn()) => {
  const check = new EventReasonAlertsSystemCheck(
    async () => token,
    jest.fn(),
    getBCSCState().account.credentialMetadata,
    { translation: ((key: string) => key) as never, logger: logger as never },
    { navigate } as never
  )

  await act(async () => {
    await runSystemChecks([check], logger as never)
  })
  // onFail saves the account details without waiting on the write
  await waitFor(() => expect(getBCSCState().account.credentialMetadata?.bcscReason).toBe(token.bcsc_reason))
  return navigate
}

describe('"card not active", from the real check through the store to Home', () => {
  beforeEach(() => {
    mockGetUserMetadata.mockReset()
    mockGetUserMetadata.mockResolvedValue(userData())
    ;(AppState as unknown as { currentState: string }).currentState = 'active'
  })

  describe('a device with tokens that never finished setup', () => {
    // verificationStarted keeps the device unfinished after unlock: the resume ends on the finish step
    const tokenOnly: BCSCStoreSeed = {
      account: {
        profile: {
          accountId: 'account-1',
          issuer: 'https://issuer.example.com',
          securityMethod: 'app_pin_no_device_authn' as never,
        },
        registration: { clientId: 'client-1', issuer: 'https://issuer.example.com' },
        tokens: { refreshToken: UNEXPIRED_JWT },
      },
      app: { verificationStarted: true },
    }

    it('records an expiry at launch, keeps it through the verify flow and a restart, and no longer applies once the saved details are cleared', async () => {
      const device = await renderDevice(tokenOnly)
      expect(device.current.notice.type).toBe(HomeNoticeType.BCSCVerified)

      await runAccountChangeCheck(device, EXPIRE_TOKEN)

      expect(device.current.verification).toMatchObject({ isVerified: false, isCardInactive: true })
      expect(device.current.notice.type).toBe(HomeNoticeType.BCSCStartVerification)

      await act(async () => getBCSCState().session.setInVerifyFlow(true))
      await act(async () => getBCSCState().session.setInVerifyFlow(false))
      expect(device.current.verification.isCardInactive).toBe(true)
      expect(device.current.notice.type).toBe(HomeNoticeType.BCSCStartVerification)

      // Restart: a new store built from what was saved, hydrated again with the same tokens
      const restarted = await renderDevice(persistedState())
      expect(restarted.current.verification).toMatchObject({ isVerified: false, isCardInactive: true })
      expect(restarted.current.notice.type).not.toBe(HomeNoticeType.BCSCVerified)

      await act(async () => getBCSCState().account.setCredentialMetadata(undefined))
      expect(getBCSCState().account.credentialMetadata).toBeUndefined()
      expect(restarted.current.verification.isCardInactive).toBe(false)
    })

    it('is a verified, active card once the real finish step runs, with no reset in between', async () => {
      const device = await renderDevice(tokenOnly)
      await runAccountChangeCheck(device, EXPIRE_TOKEN)
      expect(device.current.verification.isCardInactive).toBe(true)

      await act(async () => {
        await device.current.secure.updateVerified(true)
      })

      expect(getBCSCState().account.credential).toBeDefined()
      expect(getBCSCState().account.credentialMetadata).toBeUndefined()
      expect(device.current.verification).toMatchObject({ isVerified: true, isCardInactive: false })
      await waitFor(() => expect(device.current.notice.type).toBe(HomeNoticeType.None))
    })
  })

  describe('a credential record that says cancelled or expired, with a usable token', () => {
    const upgraded: BCSCStoreSeed = {
      account: { credential: nativeCredential(), tokens: { refreshToken: UNEXPIRED_JWT } },
      session: { credentialDeactivated: true },
    }

    it('shows the expired notice, and stays on it when the server says expired', async () => {
      const device = await renderDevice(upgraded)
      expect(device.current.notice.type).toBe(HomeNoticeType.AccountExpired)

      const navigate = await runAccountChangeCheck(device, EXPIRE_TOKEN)

      expect(navigate).not.toHaveBeenCalled()
      expect(device.current.notice.type).toBe(HomeNoticeType.AccountExpired)
    })

    it('sends the user to the device-invalidated screen when the server says cancelled', async () => {
      const device = await renderDevice(upgraded)

      const navigate = await runAccountChangeCheck(device, CANCEL_TOKEN)

      expect(navigate).toHaveBeenCalledWith(BCSCModals.DeviceInvalidated, { invalidationReason: BCSCReason.Cancel })
    })
  })
})
