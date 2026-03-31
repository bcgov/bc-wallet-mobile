import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { verifyPIN } from 'react-native-bcsc-core'
import { EnterPINScreen } from './EnterPINScreen'

jest.mock('react-native-bcsc-core', () => ({
  verifyPIN: jest
    .fn()
    .mockResolvedValue({ success: false, walletKey: '', locked: false, message: 'Incorrect PIN', remainingTime: 0 }),
}))

const mockHandleSuccessfulAuth = jest.fn()

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({
    handleSuccessfulAuth: mockHandleSuccessfulAuth,
  }),
}))

const mockVerifyPIN = jest.mocked(verifyPIN)

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
    mockVerifyPIN.mockResolvedValue({
      success: false,
      walletKey: '',
      locked: false,
      message: 'Incorrect PIN',
      remainingTime: 0,
    })
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
        expect(tree.getByText('Enter your 6-digit PIN')).toBeTruthy()
      })

      expect(tree).toMatchSnapshot()
    })
  })

  describe('PIN verification - locked account', () => {
    it('navigates to Lockout screen when PIN verification returns locked', async () => {
      mockVerifyPIN.mockResolvedValue({ success: false, walletKey: '', locked: true, message: '', remainingTime: 60 })

      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('Enter your 6-digit PIN')).toBeTruthy()
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
    })
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
