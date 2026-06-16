import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { VerificationSessionExpired } from './VerificationSessionExpired'

const mockFactoryReset = jest.fn().mockResolvedValue({ success: true })
jest.mock('@/bcsc-theme/api/hooks/useFactoryReset', () => ({
  useFactoryReset: () => mockFactoryReset,
}))

describe('VerificationSessionExpired', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the header, content and button', () => {
    const { getByText } = render(
      <BasicAppContext>
        <VerificationSessionExpired />
      </BasicAppContext>
    )

    expect(getByText('BCSC.Modals.VerificationSessionExpired.Header')).toBeTruthy()
    expect(getByText('BCSC.Modals.VerificationSessionExpired.ContentA')).toBeTruthy()
    expect(getByText('BCSC.Modals.VerificationSessionExpired.ContentB')).toBeTruthy()
    expect(getByText('BCSC.Modals.VerificationSessionExpired.Button')).toBeTruthy()
  })

  it('should match snapshot', () => {
    const tree = render(
      <BasicAppContext>
        <VerificationSessionExpired />
      </BasicAppContext>
    )

    expect(tree.toJSON()).toMatchSnapshot()
  })

  it('runs a factory reset when the button is pressed', async () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <VerificationSessionExpired />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('VerificationSessionExpiredButton')))

    await waitFor(() => {
      expect(mockFactoryReset).toHaveBeenCalledWith()
    })
  })
})
