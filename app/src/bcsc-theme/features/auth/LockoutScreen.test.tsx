import { LockoutScreen } from '@/bcsc-theme/features/auth/LockoutScreen'
import { readPinLockout } from '@/bcsc-theme/features/auth/services/pin-lockout-service'
import { PinLockoutType } from '@/bcsc-theme/state/pin-lockout/pin-lockout'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { bifoldLoggerInstance, testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { useFocusEffect } from '@react-navigation/native'
import { act, fireEvent, render } from '@testing-library/react-native'
import React, { useEffect, useState } from 'react'

jest.mock('@/bcsc-theme/features/auth/services/pin-lockout-service', () => ({
  ...jest.requireActual('@/bcsc-theme/features/auth/services/pin-lockout-service'),
  readPinLockout: jest.fn(),
}))

// The wording is covered by lockout-countdown.test.ts; here the countdown shows the time it was given
jest.mock('@/bcsc-theme/features/auth/lockout-countdown', () => ({
  formatLockoutCountdown: (_t: unknown, remainingMs: number) => `${remainingMs} ms left`,
}))

const mockReadPinLockout = jest.mocked(readPinLockout)

const SECOND = 1000
const NOW = new Date('2026-11-16T12:00:00.000Z').getTime()

const lockedFor = (remainingMs: number) => ({
  type: PinLockoutType.Locked as const,
  until: new Date(NOW + remainingMs),
})

const pinEntryReset = {
  type: 'RESET',
  payload: { index: 1, routes: [{ name: BCSCScreens.AccountLanding }, { name: BCSCScreens.EnterPIN }] },
}

describe('LockoutScreen', () => {
  let mockNavigation: ReturnType<typeof useNavigation>
  let setScreenFocused: (focused: boolean) => void

  // The container's init() swaps in this shared logger, whatever BasicAppContext registers.
  const errorSpy = jest.spyOn(bifoldLoggerInstance, 'error').mockImplementation(() => undefined)

  afterAll(() => {
    errorSpy.mockRestore()
  })

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    mockReadPinLockout.mockResolvedValue(lockedFor(30 * SECOND))

    // Mirrors the real hook: the callback runs while the screen is focused and is cleaned up on blur
    jest.mocked(useFocusEffect).mockImplementation((callback: () => void | (() => void)) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [focused, setFocused] = useState(true)
      setScreenFocused = setFocused
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => (focused ? callback() : undefined), [callback, focused])
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  /** Renders the screen and lets its read of the lock settle */
  const renderScreen = async () => {
    const tree = render(
      <BasicAppContext>
        <LockoutScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    await act(async () => {
      await jest.advanceTimersByTimeAsync(0)
    })

    return tree
  }

  const advance = async (ms: number) => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ms)
    })
  }

  describe('snapshots', () => {
    it('renders correctly when locked', async () => {
      const tree = await renderScreen()

      expect(tree.getByText('30000 ms left')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })
  })

  describe('countdown', () => {
    it('shows the time left until the lock ends', async () => {
      mockReadPinLockout.mockResolvedValue(lockedFor(90 * SECOND))

      const tree = await renderScreen()

      expect(tree.getByText('BCSC.Lockout.TryAgainIn')).toBeTruthy()
      expect(tree.getByText('90000 ms left')).toBeTruthy()
    })

    it('counts down every second', async () => {
      const tree = await renderScreen()

      await advance(SECOND)
      expect(tree.getByText('29000 ms left')).toBeTruthy()

      await advance(2 * SECOND)
      expect(tree.getByText('27000 ms left')).toBeTruthy()
    })

    it('measures the time left against the clock, not the number of ticks', async () => {
      const tree = await renderScreen()

      // The app was suspended for 20 seconds: no ticks ran, but the clock moved on
      jest.setSystemTime(NOW + 20 * SECOND)
      await advance(SECOND)

      expect(tree.getByText('9000 ms left')).toBeTruthy()
    })

    it('shows no countdown until the lock has been read', async () => {
      mockReadPinLockout.mockReturnValue(new Promise(() => {}))

      const tree = await renderScreen()

      expect(tree.getByText('BCSC.Lockout.Title')).toBeTruthy()
      expect(tree.queryByText('BCSC.Lockout.TryAgainIn')).toBeNull()
    })
  })

  describe('release', () => {
    it('opens PIN entry over the landing screen when the lock ends', async () => {
      await renderScreen()

      await advance(29 * SECOND)
      expect(mockNavigation.dispatch).not.toHaveBeenCalled()

      await advance(SECOND)
      expect(mockNavigation.dispatch).toHaveBeenCalledWith(pinEntryReset)
    })

    it('opens PIN entry only once', async () => {
      await renderScreen()

      await advance(60 * SECOND)

      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1)
    })

    it('opens PIN entry on the next tick when the clock jumps past the end of the lock', async () => {
      await renderScreen()

      jest.setSystemTime(NOW + 60 * SECOND)
      await advance(SECOND)

      expect(mockNavigation.dispatch).toHaveBeenCalledWith(pinEntryReset)
    })

    it('opens PIN entry straight away when PIN entry is not locked', async () => {
      mockReadPinLockout.mockResolvedValue({ type: PinLockoutType.Open })

      const tree = await renderScreen()

      expect(mockNavigation.dispatch).toHaveBeenCalledWith(pinEntryReset)
      expect(tree.queryByText('BCSC.Lockout.TryAgainIn')).toBeNull()
    })

    it('does not open PIN entry while another screen is in front, and checks the lock again on return', async () => {
      await renderScreen()
      expect(mockReadPinLockout).toHaveBeenCalledTimes(1)

      act(() => setScreenFocused(false))
      await advance(60 * SECOND)
      expect(mockNavigation.dispatch).not.toHaveBeenCalled()

      mockReadPinLockout.mockResolvedValue({ type: PinLockoutType.Open })
      act(() => setScreenFocused(true))
      await advance(0)

      expect(mockReadPinLockout).toHaveBeenCalledTimes(2)
      expect(mockNavigation.dispatch).toHaveBeenCalledWith(pinEntryReset)
    })

    it('shows the new deadline when the screen comes back into view while still locked', async () => {
      const tree = await renderScreen()

      act(() => setScreenFocused(false))
      jest.setSystemTime(NOW + 10 * SECOND)
      act(() => setScreenFocused(true))
      await advance(0)

      expect(tree.getByText('20000 ms left')).toBeTruthy()
      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
    })

    it('stops counting when the screen is removed', async () => {
      const tree = await renderScreen()

      tree.unmount()
      await advance(60 * SECOND)

      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('goes back to the landing screen, without opening PIN entry, when the lock cannot be read', async () => {
      const readError = new Error('read failed')
      mockReadPinLockout.mockRejectedValue(readError)

      await renderScreen()

      expect(errorSpy).toHaveBeenCalledWith('Error checking lock status: read failed', readError)
      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1)
      expect(mockNavigation.dispatch).toHaveBeenCalledWith({
        type: 'RESET',
        payload: { index: 0, routes: [{ name: BCSCScreens.AccountLanding }] },
      })
    })
  })

  describe('remove account', () => {
    it('asks for confirmation on its own screen when Remove Account is pressed', async () => {
      const tree = await renderScreen()

      fireEvent.press(tree.getByTestId(testIdWithKey(TestIds.auth.lockout.removeAccount)))

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1)
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.AuthRemoveAccountConfirmation)
    })
  })

  describe('UI content', () => {
    it('displays all informational text', async () => {
      const tree = await renderScreen()

      expect(tree.getByText('BCSC.Lockout.Title')).toBeTruthy()
      expect(tree.getByText('BCSC.Lockout.Description')).toBeTruthy()
      expect(tree.getByText('BCSC.Lockout.TryAgainIn')).toBeTruthy()
      expect(tree.getByText('BCSC.Lockout.ForgotPINTitle')).toBeTruthy()
      expect(tree.getByText('BCSC.Lockout.ForgotPINDescription')).toBeTruthy()
      expect(tree.getByText('BCSC.Lockout.SetUpAgain')).toBeTruthy()
      expect(tree.getByText('BCSC.Account.RemoveAccount')).toBeTruthy()
    })
  })
})
