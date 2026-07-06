import { render, screen } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'

import CredentialsReadyGate from './CredentialsReadyGate'

const mockUseCredentials = jest.fn()

jest.mock('@bifold/react-hooks', () => ({
  useCredentials: () => mockUseCredentials(),
}))

jest.mock('@bifold/core', () => ({
  useTheme: () => ({
    ColorPalette: { brand: { primary: '#000' } },
  }),
}))

describe('CredentialsReadyGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows a loading indicator while credentials are still loading', () => {
    mockUseCredentials.mockReturnValue({ loading: true, records: [] })

    render(
      <CredentialsReadyGate testID="gate">
        <Text>child</Text>
      </CredentialsReadyGate>
    )

    expect(screen.getByTestId('gate')).toBeTruthy()
    expect(screen.queryByText('child')).toBeNull()
  })

  it('renders children once credentials have finished loading', () => {
    mockUseCredentials.mockReturnValue({ loading: false, records: [] })

    render(
      <CredentialsReadyGate testID="gate">
        <Text>child</Text>
      </CredentialsReadyGate>
    )

    expect(screen.getByText('child')).toBeTruthy()
    expect(screen.queryByTestId('gate')).toBeNull()
  })
})
