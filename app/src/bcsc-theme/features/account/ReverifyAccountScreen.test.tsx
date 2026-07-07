import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { ReverifyAccountScreen } from './ReverifyAccountScreen'

const mockStopLoading = jest.fn()
const mockStartLoading = jest.fn().mockReturnValue(mockStopLoading)
const mockContinueVerificationProcess = jest.fn()
const mockVerificationReset = jest.fn()

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: jest.fn(() => ({
    startLoading: mockStartLoading,
  })),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  useSecureActions: jest.fn(() => ({
    continueVerificationProcess: mockContinueVerificationProcess,
  })),
}))

jest.mock('@/bcsc-theme/hooks/useVerificationReset', () => ({
  useVerificationReset: jest.fn(() => mockVerificationReset),
}))

const makeRoute = (isExpired: boolean) => ({ params: { isExpired } }) as any

const renderScreen = (isExpired = false) =>
  render(
    <BasicAppContext>
      <ReverifyAccountScreen route={makeRoute(isExpired)} />
    </BasicAppContext>
  )

describe('ReverifyAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStartLoading.mockReturnValue(mockStopLoading)
  })

  it('renders correctly for a renewal notification', () => {
    expect(renderScreen(false)).toMatchSnapshot()
  })

  it('renders correctly for an expiry notification', () => {
    expect(renderScreen(true)).toMatchSnapshot()
  })

  describe('onPrimaryAction', () => {
    const pressAction = (screen: ReturnType<typeof renderScreen>) =>
      fireEvent.press(screen.getByTestId(testIdWithKey('BCSC.ReverifyAccount.PrimaryAction')))

    it('starts loading then stops loading regardless of outcome', async () => {
      mockVerificationReset.mockResolvedValue(true)
      pressAction(renderScreen())

      await waitFor(() => {
        expect(mockStartLoading).toHaveBeenCalledWith('BCSC.ReverifyAccount.Loading')
        expect(mockStopLoading).toHaveBeenCalled()
      })
    })

    it('calls continueVerificationProcess when reset succeeds', async () => {
      mockVerificationReset.mockResolvedValue(true)
      pressAction(renderScreen())

      await waitFor(() => {
        expect(mockContinueVerificationProcess).toHaveBeenCalled()
      })
    })

    it('does not call continueVerificationProcess when reset returns false', async () => {
      mockVerificationReset.mockResolvedValue(false)
      pressAction(renderScreen())

      await waitFor(() => expect(mockStopLoading).toHaveBeenCalled())
      expect(mockContinueVerificationProcess).not.toHaveBeenCalled()
    })

    it('stops loading and does not navigate when reset throws', async () => {
      mockVerificationReset.mockRejectedValue(new Error('reset failed'))
      pressAction(renderScreen())

      await waitFor(() => expect(mockStopLoading).toHaveBeenCalled())
      expect(mockContinueVerificationProcess).not.toHaveBeenCalled()
    })
  })
})
