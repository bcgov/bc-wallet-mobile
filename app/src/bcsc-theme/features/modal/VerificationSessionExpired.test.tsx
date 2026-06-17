import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { VerificationSessionExpired } from './VerificationSessionExpired'

const mockFactoryReset = jest.fn().mockResolvedValue({ success: true })
jest.mock('@/bcsc-theme/api/hooks/useFactoryReset', () => ({
  useFactoryReset: () => mockFactoryReset,
}))

const mockFactoryResetAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ factoryResetAlert: mockFactoryResetAlert }),
}))

const renderModal = () =>
  render(
    <BasicAppContext>
      <VerificationSessionExpired {...({ navigation: { navigate: jest.fn() }, route: {} } as any)} />
    </BasicAppContext>
  )

describe('VerificationSessionExpired', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the header, content and button', () => {
    const { getByText } = renderModal()

    expect(getByText('BCSC.Modals.VerificationSessionExpired.Header')).toBeTruthy()
    expect(getByText('BCSC.Modals.VerificationSessionExpired.ContentA')).toBeTruthy()
    expect(getByText('BCSC.Modals.VerificationSessionExpired.ContentB')).toBeTruthy()
    expect(getByText('BCSC.Modals.VerificationSessionExpired.Button')).toBeTruthy()
  })

  it('should match snapshot', () => {
    const tree = renderModal()

    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('runs a factory reset when the button is pressed', async () => {
    const { getByTestId } = renderModal()

    fireEvent.press(getByTestId(testIdWithKey('VerificationSessionExpiredButton')))

    await waitFor(() => {
      expect(mockFactoryReset).toHaveBeenCalledWith()
    })
  })

  it('surfaces the factory-reset alert when the reset fails', async () => {
    const error = new Error('reset failed')
    mockFactoryReset.mockResolvedValueOnce({ success: false, error })

    const { getByTestId } = renderModal()

    fireEvent.press(getByTestId(testIdWithKey('VerificationSessionExpiredButton')))

    await waitFor(() => {
      expect(mockFactoryResetAlert).toHaveBeenCalledWith(error)
    })
  })
})
