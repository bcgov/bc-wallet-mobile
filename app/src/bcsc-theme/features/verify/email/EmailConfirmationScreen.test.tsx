import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { CommonActions } from '@react-navigation/native'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import Toast from 'react-native-toast-message'
import EmailConfirmationScreen from './EmailConfirmationScreen'

const mockSendEmailVerificationCode = jest.fn()
const mockCreateEmailVerification = jest.fn()

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    evidence: {
      sendEmailVerificationCode: mockSendEmailVerificationCode,
      createEmailVerification: mockCreateEmailVerification,
    },
  })),
}))

const mockUpdateUserInfo = jest.fn().mockResolvedValue(undefined)

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateUserInfo: mockUpdateUserInfo,
  })),
}))

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}))

describe('EmailConfirmation', () => {
  let mockNavigation: any
  const route = { params: { emailAddressId: 'test-email-id' } }

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderScreen = (initialStateOverride = {}) =>
    render(
      <BasicAppContext initialStateOverride={initialStateOverride}>
        <EmailConfirmationScreen navigation={mockNavigation as never} route={route as never} />
      </BasicAppContext>
    )

  describe('Rendering', () => {
    test('renders correctly', () => {
      const tree = renderScreen()
      expect(tree).toMatchSnapshot()
    })
  })

  describe('Submission', () => {
    test('shows error when submitting empty code', () => {
      renderScreen()
      fireEvent.press(screen.getByTestId('ContinueButton'))
      expect(screen.getByText('BCSC.EmailConfirmation.CodeError')).toBeTruthy()
    })

    test('shows error when code is less than 6 digits', () => {
      renderScreen()
      const codeInput = screen.getByTestId(testIdWithKey('EmailConfirmationCodeInput'))
      fireEvent.changeText(codeInput, '123')
      fireEvent.press(screen.getByTestId('ContinueButton'))
      expect(screen.getByText('BCSC.EmailConfirmation.CodeError')).toBeTruthy()
    })

    test('submits valid 6-digit code', async () => {
      mockSendEmailVerificationCode.mockResolvedValue(undefined)
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('EmailConfirmationCodeInput'))
      fireEvent.changeText(codeInput, '123456')
      fireEvent.press(screen.getByTestId('ContinueButton'))

      await waitFor(() => {
        expect(mockSendEmailVerificationCode).toHaveBeenCalledWith('123456', 'test-email-id')
      })
    })

    test('updates user info after successful verification', async () => {
      mockSendEmailVerificationCode.mockResolvedValue(undefined)
      renderScreen({
        bcscSecure: { emailAddress: 'test@example.com' },
      })

      const codeInput = screen.getByTestId(testIdWithKey('EmailConfirmationCodeInput'))
      fireEvent.changeText(codeInput, '123456')
      fireEvent.press(screen.getByTestId('ContinueButton'))

      await waitFor(() => {
        expect(mockUpdateUserInfo).toHaveBeenCalledWith({
          email: 'test@example.com',
          isEmailVerified: true,
        })
      })
    })

    test('navigates to SetupSteps on success', async () => {
      mockSendEmailVerificationCode.mockResolvedValue(undefined)
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('EmailConfirmationCodeInput'))
      fireEvent.changeText(codeInput, '123456')
      fireEvent.press(screen.getByTestId('ContinueButton'))

      await waitFor(() => {
        expect(mockNavigation.dispatch).toHaveBeenCalled()
        expect(CommonActions.reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      })
    })

    test('shows error when submission fails', async () => {
      mockSendEmailVerificationCode.mockRejectedValue(new Error('API Error'))
      renderScreen()

      const codeInput = screen.getByTestId(testIdWithKey('EmailConfirmationCodeInput'))
      fireEvent.changeText(codeInput, '123456')
      fireEvent.press(screen.getByTestId('ContinueButton'))

      await waitFor(() => {
        expect(screen.getByText('BCSC.EmailConfirmation.ErrorTitle')).toBeTruthy()
      })
    })
  })

  describe('Resend Code', () => {
    test('resends verification code and shows toast', async () => {
      mockCreateEmailVerification.mockResolvedValue({ email_address_id: 'new-email-id' })
      renderScreen({
        bcscSecure: { emailAddress: 'test@example.com' },
      })

      fireEvent.press(screen.getByTestId('ResendCodeButton'))

      await waitFor(() => {
        expect(mockCreateEmailVerification).toHaveBeenCalledWith('test@example.com')
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            text1: 'BCSC.EmailConfirmation.CodeResent',
          })
        )
      })
    })

    test('shows error when resend fails', async () => {
      mockCreateEmailVerification.mockRejectedValue(new Error('API Error'))
      renderScreen({
        bcscSecure: { emailAddress: 'test@example.com' },
      })

      fireEvent.press(screen.getByTestId('ResendCodeButton'))

      await waitFor(() => {
        expect(screen.getByText('BCSC.EmailConfirmation.ErrorResendingCode')).toBeTruthy()
      })
    })

    test('uses new email address ID after resending', async () => {
      mockCreateEmailVerification.mockResolvedValue({ email_address_id: 'new-email-id' })
      mockSendEmailVerificationCode.mockResolvedValue(undefined)
      renderScreen({
        bcscSecure: { emailAddress: 'test@example.com' },
      })

      fireEvent.press(screen.getByTestId('ResendCodeButton'))

      await waitFor(() => {
        expect(mockCreateEmailVerification).toHaveBeenCalled()
      })

      const codeInput = screen.getByTestId(testIdWithKey('EmailConfirmationCodeInput'))
      fireEvent.changeText(codeInput, '654321')
      fireEvent.press(screen.getByTestId('ContinueButton'))

      await waitFor(() => {
        expect(mockSendEmailVerificationCode).toHaveBeenCalledWith('654321', 'new-email-id')
      })
    })
  })
})
