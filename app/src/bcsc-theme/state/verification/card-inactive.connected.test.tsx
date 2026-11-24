import { BCSCAccountProvider } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useSecureActions } from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { UNEXPIRED_JWT } from '@/bcsc-theme/utils/__fixtures__/jwt'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { runSystemChecks } from '@/services/system-checks/system-checks'
import {
  BCDispatchAction,
  BCLocalStorageKeys,
  BCSCSecureState,
  BCSCState,
  BCState,
  initialBCSCSecureState,
  migrateBCSCState,
} from '@/store'
import { PersistentStorage, useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import moment from 'moment'
import React from 'react'
import { AppState } from 'react-native'
import { CredentialInfo, getAccount, getCredential, getToken, setCredential, TokenType } from 'react-native-bcsc-core'
import { AccountPhaseType } from '../account/account-phase'
import { useAccountPhase } from '../account/useAccountPhase'
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
    bcsc_event: event,
    bcsc_reason: reason,
    bcsc_status_date: 1234567890,
    bcsc_devices_count: 1,
    bcsc_max_devices: 5,
  }) as unknown as IdToken

const EXPIRE_TOKEN = idToken(BCSCEvent.Expire, BCSCReason.ExpiredBySystem)
const CANCEL_TOKEN = idToken(BCSCEvent.Cancel, BCSCReason.Cancel)

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

const renderDevice = async (secure: Partial<BCSCSecureState>, bcsc: Partial<BCSCState> = {}) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BasicAppContext
      initialStateOverride={{
        bcsc: bcsc as BCState['bcsc'],
        bcscSecure: { ...initialBCSCSecureState, isHydrated: true, ...secure },
      }}
    >
      <BCSCAccountProvider>{children}</BCSCAccountProvider>
    </BasicAppContext>
  )

  const { result } = renderHook(
    () => {
      const [store, dispatch] = useStore<BCState>()
      return {
        store,
        dispatch,
        notice: useHomeNotice(),
        verification: useVerificationState(),
        phase: useAccountPhase(),
        secure: useSecureActions(),
      }
    },
    { wrapper }
  )
  // Let the account load the provider starts on mount settle
  await act(async () => {})
  return result
}

type Device = Awaited<ReturnType<typeof renderDevice>>

const dispatchOn = (device: Device, type: BCDispatchAction, payload: unknown[]) =>
  act(async () => {
    device.current.dispatch({ type, payload } as Parameters<typeof device.current.dispatch>[0])
  })

/** Runs the real account-change check against the device's own store, as the main stack does. */
const runAccountChangeCheck = async (device: Device, token: IdToken, navigate = jest.fn()) => {
  const { store, dispatch } = device.current
  const check = new EventReasonAlertsSystemCheck(
    async () => token,
    jest.fn(),
    store.bcsc.credentialMetadata,
    { dispatch, translation: ((key: string) => key) as never, logger: logger as never },
    { navigate } as never
  )

  await act(async () => {
    await runSystemChecks([check], logger as never)
  })
  return navigate
}

describe('"card not active", from the real check through the store to Home', () => {
  const storeValueForKey = jest.spyOn(PersistentStorage, 'storeValueForKey')

  beforeEach(() => {
    mockGetUserMetadata.mockReset()
    mockGetUserMetadata.mockResolvedValue(userData())
    ;(AppState as unknown as { currentState: string }).currentState = 'active'
  })

  // The last BCSC blob the reducer saved, as the app reads it back on the next launch
  const persistedBcsc = (): Partial<BCSCState> => {
    const saves = storeValueForKey.mock.calls.filter(([key]) => key === BCLocalStorageKeys.BCSC)
    return migrateBCSCState(saves.at(-1)![1] as BCSCState).bcsc
  }

  describe('a device with tokens that never finished setup', () => {
    // verificationStarted keeps the device unfinished after unlock: the resume ends on the finish step
    const tokenOnly = { refreshToken: UNEXPIRED_JWT }
    const started = { verificationStarted: true }

    it('records an expiry at launch, keeps it through the verify flow and a restart, and no longer applies once the saved details are cleared', async () => {
      const device = await renderDevice(tokenOnly, started)
      expect(device.current.notice.type).toBe(HomeNoticeType.BCSCVerified)

      await runAccountChangeCheck(device, EXPIRE_TOKEN)

      expect(device.current.verification).toMatchObject({ isVerified: false, isCardInactive: true })
      expect(device.current.notice.type).toBe(HomeNoticeType.BCSCStartVerification)

      await dispatchOn(device, BCDispatchAction.UPDATE_SECURE_IN_VERIFY_FLOW, [true])
      await dispatchOn(device, BCDispatchAction.UPDATE_SECURE_IN_VERIFY_FLOW, [false])
      expect(device.current.verification.isCardInactive).toBe(true)
      expect(device.current.notice.type).toBe(HomeNoticeType.BCSCStartVerification)

      // Restart: a new store built from what was saved, hydrated again with the same tokens
      const restarted = await renderDevice(tokenOnly, persistedBcsc())
      expect(restarted.current.verification).toMatchObject({ isVerified: false, isCardInactive: true })
      expect(restarted.current.notice.type).not.toBe(HomeNoticeType.BCSCVerified)

      await dispatchOn(restarted, BCDispatchAction.UPDATE_CREDENTIAL_METADATA, [undefined])
      expect(restarted.current.store.bcsc.credentialMetadata).toBeUndefined()
      expect(restarted.current.verification.isCardInactive).toBe(false)
    })

    it('is a verified, active card once the real finish step runs, with no reset in between', async () => {
      jest.mocked(getAccount).mockResolvedValue({ issuer: 'https://issuer.example.com', clientID: 'client-1' } as never)
      const device = await renderDevice(tokenOnly, started)
      await runAccountChangeCheck(device, EXPIRE_TOKEN)
      expect(device.current.verification.isCardInactive).toBe(true)

      await act(async () => {
        await device.current.secure.completeVerification()
      })

      expect(setCredential).toHaveBeenCalledTimes(1)
      expect(device.current.store.bcsc.credentialMetadata).toBeUndefined()
      expect(device.current.verification).toMatchObject({ isVerified: true, isCardInactive: false })
      await waitFor(() => expect(device.current.notice.type).toBe(HomeNoticeType.None))
    })
  })

  describe('a credential record that says cancelled or expired, with a usable token', () => {
    const upgraded = { hasCredentialRecord: true, credentialDeactivated: true, refreshToken: UNEXPIRED_JWT }

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
  // Native storage is faked statefully, so a restart runs the real hydrateSecureState on what earlier steps wrote.
  // Reset is its end state (memory clear, native deletes); the hook itself is covered in useVerificationReset.test.
  describe('the credential record fact through finish, cancel, reset and restarts', () => {
    const account = { issuer: 'https://issuer.example.com', clientID: 'client-1' }
    const native: { credential: CredentialInfo | null; refreshToken?: string } = { credential: null }

    beforeEach(() => {
      native.credential = null
      native.refreshToken = UNEXPIRED_JWT
      jest.mocked(getAccount).mockResolvedValue(account as never)
      jest.mocked(getCredential).mockImplementation(async () => native.credential)
      jest.mocked(setCredential).mockImplementation(async (credential) => {
        native.credential = credential
      })
      jest
        .mocked(getToken)
        .mockImplementation(
          async (type) =>
            (type === TokenType.Refresh && native.refreshToken
              ? { id: 'refresh', type, token: native.refreshToken, created: 0 }
              : null) as never
        )
    })

    afterEach(() => {
      jest.mocked(getAccount).mockResolvedValue(null as never)
      jest.mocked(getCredential).mockResolvedValue(null)
      jest.mocked(setCredential).mockResolvedValue(undefined)
      jest.mocked(getToken).mockResolvedValue(null as never)
    })

    const restart = async () => {
      const device = await renderDevice({ isHydrated: false }, persistedBcsc())
      await act(async () => {
        await device.current.secure.hydrateSecureState()
      })
      return device
    }

    const finishVerification = async () => {
      const device = await renderDevice({ refreshToken: UNEXPIRED_JWT }, { verificationStarted: true })
      await act(async () => {
        await device.current.secure.completeVerification()
      })
      return device
    }

    it('is a verified, active card after finishing and restarting', async () => {
      const device = await finishVerification()
      expect(device.current.store.bcscSecure.hasCredentialRecord).toBe(true)

      const restarted = await restart()

      expect(restarted.current.store.bcscSecure.hasCredentialRecord).toBe(true)
      expect(restarted.current.verification).toMatchObject({ isVerified: true, isCardInactive: false })
      await waitFor(() => expect(restarted.current.phase.phase).toBe(AccountPhaseType.Active))
    })

    it('keeps the record, and reads the card as not active, after a cancel is saved and the app restarts', async () => {
      const device = await finishVerification()

      const navigate = await runAccountChangeCheck(device, CANCEL_TOKEN)

      expect(navigate).toHaveBeenCalledWith(BCSCModals.DeviceInvalidated, { invalidationReason: BCSCReason.Cancel })
      expect(device.current.verification).toMatchObject({ isVerified: true, isCardInactive: true })

      const restarted = await restart()

      expect(restarted.current.store.bcscSecure.hasCredentialRecord).toBe(true)
      expect(restarted.current.verification).toMatchObject({ isVerified: true, isCardInactive: true })
      await waitFor(() => expect(restarted.current.phase.phase).toBe(AccountPhaseType.Expired))
    })

    it('has no record, and no card to judge, after the reset clears memory and storage and the app restarts', async () => {
      const device = await finishVerification()
      await runAccountChangeCheck(device, CANCEL_TOKEN)

      native.credential = null
      native.refreshToken = undefined
      await dispatchOn(device, BCDispatchAction.CLEAR_SECURE_STATE, [{ isHydrated: true, inVerifyFlow: false }])
      await dispatchOn(device, BCDispatchAction.UPDATE_CREDENTIAL_METADATA, [undefined])
      expect(device.current.store.bcscSecure.hasCredentialRecord).toBe(false)

      const restarted = await restart()

      expect(restarted.current.store.bcscSecure.hasCredentialRecord).toBe(false)
      expect(restarted.current.verification).toMatchObject({ isVerified: false, isCardInactive: false })
      expect(restarted.current.phase.phase).toBe(AccountPhaseType.None)
    })
  })
})
