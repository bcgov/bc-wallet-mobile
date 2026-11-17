import {
  PinVerification,
  PinVerificationType,
  verifyPinWithLockout,
} from '@/bcsc-theme/features/auth/services/pin-lockout-service'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { EnterPINScreen } from './EnterPINScreen'

jest.mock('@/bcsc-theme/features/auth/services/pin-lockout-service', () => ({
  ...jest.requireActual('@/bcsc-theme/features/auth/services/pin-lockout-service'),
  verifyPinWithLockout: jest.fn(),
}))

const mockHandleSuccessfulAuth = jest.fn()
const mockStopLoading = jest.fn()
const mockStartLoading = jest.fn(() => mockStopLoading)

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: () => ({ startLoading: mockStartLoading }),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({
    handleSuccessfulAuth: mockHandleSuccessfulAuth,
  }),
}))

const mockVerifyPinWithLockout = jest.mocked(verifyPinWithLockout)

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
} as any

describe('EnterPINScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockVerifyPinWithLockout.mockResolvedValue({ type: PinVerificationType.Incorrect, isLastAttempt: false })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('snapshots', () => {
    it('renders correctly', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.EnterPIN.Title')).toBeTruthy()
      })

      expect(tree).toMatchSnapshot()
    })
  })

  describe('PIN verification - locked account', () => {
    it('navigates to Lockout screen when PIN verification returns locked', async () => {
      mockVerifyPinWithLockout.mockResolvedValue({
        type: PinVerificationType.Locked,
        until: new Date('2026-11-16T12:01:00.000Z'),
      })

      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.EnterPIN.Title')).toBeTruthy()
      })

      // Simulate entering a 6-digit PIN and pressing Continue
      fireEvent.changeText(tree.getByA11yHint('Enter your 6-digit PIN'), '123456')
      fireEvent.press(tree.getByTestId(testIdWithKey('Continue')))

      await waitFor(() => {
        expect(mockNavigation.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'RESET',
            payload: expect.objectContaining({
              routes: [{ name: BCSCScreens.Lockout }],
            }),
          })
        )
      })
      expect(mockStartLoading).not.toHaveBeenCalled()
    })
  })

  describe('PIN verification - wrong PIN', () => {
    const enterPIN = (pin: string) => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      fireEvent.changeText(tree.getByA11yHint('Enter your 6-digit PIN'), pin)
      fireEvent.press(tree.getByTestId(testIdWithKey('Continue')))

      return tree
    }

    it('says the PIN is incorrect', async () => {
      const tree = enterPIN('123456')

      await waitFor(() => {
        expect(tree.getByText('BCSC.EnterPIN.IncorrectPIN')).toBeTruthy()
      })
      expect(mockVerifyPinWithLockout).toHaveBeenCalledWith('123456', expect.anything())
      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
      expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
    })

    it('warns when one more wrong PIN would lock the app', async () => {
      mockVerifyPinWithLockout.mockResolvedValue({ type: PinVerificationType.Incorrect, isLastAttempt: true })

      const tree = enterPIN('123456')

      await waitFor(() => {
        expect(tree.getByText('BCSC.EnterPIN.LastAttemptWarning')).toBeTruthy()
      })
      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
    })

    it('does not check a PIN that is too short', async () => {
      const tree = enterPIN('123')

      await waitFor(() => {
        expect(tree.getByText('BCSC.PIN.PINTooShort')).toBeTruthy()
      })
      expect(mockVerifyPinWithLockout).not.toHaveBeenCalled()
    })

    it('shows an error and stays on the screen when the PIN cannot be checked', async () => {
      mockVerifyPinWithLockout.mockRejectedValue(new Error('storage failed'))

      const tree = enterPIN('123456')

      await waitFor(() => {
        expect(tree.getByText('BCSC.EnterPIN.VerifyError')).toBeTruthy()
      })
      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
      expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
    })
  })

  it('starts account loading only after PIN verification succeeds and cleans up a hydration failure', async () => {
    let resolveVerification!: (result: PinVerification) => void
    let rejectHydration!: (error: Error) => void
    mockVerifyPinWithLockout.mockReturnValue(
      new Promise((resolve) => {
        resolveVerification = resolve
      })
    )
    mockHandleSuccessfulAuth.mockReturnValue(
      new Promise((_, reject) => {
        rejectHydration = reject
      })
    )

    const tree = render(
      <BasicAppContext>
        <EnterPINScreen navigation={mockNavigation} />
      </BasicAppContext>
    )
    fireEvent.changeText(tree.getByA11yHint('Enter your 6-digit PIN'), '123456')
    fireEvent.press(tree.getByTestId(testIdWithKey('Continue')))
    await waitFor(() => expect(mockVerifyPinWithLockout).toHaveBeenCalled())
    expect(mockStartLoading).not.toHaveBeenCalled()

    await act(async () => {
      resolveVerification({ type: PinVerificationType.Success, walletKey: 'test-key' })
    })
    expect(mockStartLoading).toHaveBeenCalledWith('BCSC.Loading.AppStartup')
    expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('test-key')
    expect(mockStopLoading).not.toHaveBeenCalled()

    await act(async () => {
      rejectHydration(new Error('hydration failed'))
    })
    expect(mockStopLoading).toHaveBeenCalledTimes(1)
  })

  describe('UI elements', () => {
    it('renders Get Help button', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('Global.GetHelp')).toBeTruthy()
      })
    })

    it('navigates to AuthWebView with forgot PIN help when Get Help is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('Global.GetHelp')).toBeTruthy()
      })

      fireEvent.press(tree.getByTestId(testIdWithKey('GetHelp')))

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.AuthWebView, {
        url: HelpCentreUrl.FORGOT_PIN,
        title: expect.any(String),
      })
    })

    it('renders Continue button', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByTestId('com.ariesbifold:id/Continue')).toBeTruthy()
      })
    })

    it('renders PIN input with accessibility hint', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByA11yHint('Enter your 6-digit PIN')).toBeTruthy()
      })
    })
  })
})
