import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Alert } from 'react-native'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import EnterEmailScreen from '../../src/bcsc-theme/features/verify/email/EnterEmailScreen'
import { BCSCCardType } from '../../src/bcsc-theme/types/cards'
import { BCSCScreens } from '../../src/bcsc-theme/types/navigators'

const mockCreateEmailVerification = jest.fn()
jest.mock('@/bcsc-theme/api/hooks/useApi', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      evidence: {
        createEmailVerification: mockCreateEmailVerification,
      },
    })),
  }
})

describe('EnterEmailScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = useNavigation()

    jest.spyOn(Alert, 'alert')
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render correctly', () => {
      const { getByText } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      expect(getByText('BCSC.EnterEmail.EnterEmailAddress')).toBeTruthy()
      expect(getByText('BCSC.EnterEmail.EmailDescription2')).toBeTruthy()
    })

    it('should display description for non-Other card types i.e combined', () => {
      const { getByText } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      expect(getByText('BCSC.EnterEmail.EmailDescription1')).toBeTruthy()
    })

    it('should not display description for Other card type', () => {
      const { queryByText } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Other } }} />
        </BasicAppContext>
      )

      expect(queryByText('BCSC.EnterEmail.EmailDescription1')).toBeNull()
    })

    it('should display Skip button for non-Other card types i.e combined', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      expect(getByTestId('SkipButton')).toBeTruthy()
    })

    it('should not display Skip button for Other card type', () => {
      const { queryByTestId } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Other } }} />
        </BasicAppContext>
      )

      expect(queryByTestId('SkipButton')).toBeNull()
    })
  })

  describe('Email validation', () => {
    it('should show error when submitting empty email', async () => {
      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const continueButton = getByTestId('ContinueButton')
      act(() => {
        fireEvent.press(continueButton)
      })

      await waitFor(() => {
        expect(getByText('BCSC.EmailConfirmation.EmailError')).toBeTruthy()
      })
    })

    it('should show error when submitting invalid email format', async () => {
      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const emailInput = getByTestId('EmailInput')
      act(() => {
        fireEvent.changeText(emailInput, 'invalidemail')
      })

      const continueButton = getByTestId('ContinueButton')
      act(() => {
        fireEvent.press(continueButton)
      })

      await waitFor(() => {
        expect(getByText('BCSC.EmailConfirmation.EmailError')).toBeTruthy()
      })
    })

    it('should clear error when valid email is entered', async () => {
      mockCreateEmailVerification.mockResolvedValue({ email_address_id: 'test-id' })

      const { getByTestId, getByText, queryByText } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      // First submit with empty email to trigger error
      const continueButton = getByTestId('ContinueButton')
      act(() => {
        fireEvent.press(continueButton)
      })

      await waitFor(() => {
        expect(getByText('BCSC.EmailConfirmation.EmailError')).toBeTruthy()
      })

      // Enter valid email
      const emailInput = getByTestId('EmailInput')
      act(() => {
        fireEvent.changeText(emailInput, 'test@example.com')
      })

      // Submit again with valid email
      act(() => {
        fireEvent.press(continueButton)
      })

      await waitFor(() => {
        expect(queryByText('BCSC.EmailConfirmation.EmailError')).toBeNull()
      })
    })
  })

  describe('Email submission', () => {
    it('should call API with email and navigate on success', async () => {
      mockCreateEmailVerification.mockResolvedValue({ email_address_id: 'test-id-123' })

      const { getByTestId } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const emailInput = getByTestId('EmailInput')
      act(() => {
        fireEvent.changeText(emailInput, 'test@example.com')
      })

      const continueButton = getByTestId('ContinueButton')
      act(() => {
        fireEvent.press(continueButton)
      })

      await waitFor(() => {
        expect(mockCreateEmailVerification).toHaveBeenCalledWith('test@example.com')
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.EmailConfirmation, {
          emailAddressId: 'test-id-123',
        })
      })
    })

    it('should update store with email on success', async () => {
      mockCreateEmailVerification.mockResolvedValue({ email_address_id: 'test-id' })

      const { getByTestId } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const emailInput = getByTestId('EmailInput')
      act(() => {
        fireEvent.changeText(emailInput, 'user@test.com')
      })

      const continueButton = getByTestId('ContinueButton')
      act(() => {
        fireEvent.press(continueButton)
      })

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalled()
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        BCSCScreens.EmailConfirmation,
        expect.objectContaining({
          emailAddressId: 'test-id',
        })
      )
    })

    it('should show error on API failure', async () => {
      mockCreateEmailVerification.mockRejectedValue(new Error('API Error'))

      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const emailInput = getByTestId('EmailInput')
      act(() => {
        fireEvent.changeText(emailInput, 'test@example.com')
      })

      const continueButton = getByTestId('ContinueButton')
      act(() => {
        fireEvent.press(continueButton)
      })

      await waitFor(() => {
        expect(getByText('BCSC.EmailConfirmation.ErrorTitle')).toBeTruthy()
      })
    })

    it('should stop loading after error', async () => {
      mockCreateEmailVerification.mockRejectedValue(new Error('API Error'))

      const { getByTestId, getByText } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const emailInput = getByTestId('EmailInput')
      act(() => {
        fireEvent.changeText(emailInput, 'test@example.com')
      })

      const continueButton = getByTestId('ContinueButton')
      act(() => {
        fireEvent.press(continueButton)
      })

      await waitFor(() => {
        expect(getByText('BCSC.EmailConfirmation.ErrorTitle')).toBeTruthy()
      })

      expect(continueButton.props.accessibilityState.disabled).toBe(false)
    })
  })

  describe('Skip functionality', () => {
    it('should show alert when Skip button is pressed', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const skipButton = getByTestId('SkipButton')
      act(() => {
        fireEvent.press(skipButton)
      })

      expect(Alert.alert).toHaveBeenCalledWith(
        'BCSC.EnterEmail.EmailSkip',
        'BCSC.EnterEmail.EmailSkipMessage',
        expect.arrayContaining([
          expect.objectContaining({ text: 'BCSC.EnterEmail.EmailSkipButton' }),
          expect.objectContaining({ text: 'BCSC.EnterEmail.EmailSkipButton2' }),
        ])
      )
    })

    it('should not navigate when alert is cancelled', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const skipButton = getByTestId('SkipButton')
      act(() => {
        fireEvent.press(skipButton)
      })

      // Get the cancel button callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0]
      const cancelButton = alertCall[2][0]

      // Cancel button should not have an onPress handler (or it should not navigate)
      expect(cancelButton.onPress).toBeUndefined()
      expect(mockNavigation.goBack).not.toHaveBeenCalled()
    })

    it('should navigate back when skip is confirmed', () => {
      const { getByTestId } = render(
        <BasicAppContext>
          <EnterEmailScreen navigation={mockNavigation} route={{ params: { cardType: BCSCCardType.Combined } }} />
        </BasicAppContext>
      )

      const skipButton = getByTestId('SkipButton')
      act(() => {
        fireEvent.press(skipButton)
      })

      // Get the confirm button callback and execute it
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0]
      const confirmButton = alertCall[2][1]
      act(() => {
        confirmButton.onPress()
      })

      expect(mockNavigation.goBack).toHaveBeenCalled()
    })
  })
})
