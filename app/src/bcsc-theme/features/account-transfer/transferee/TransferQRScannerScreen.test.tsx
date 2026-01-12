import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '@mocks/helpers/app'
import TransferQRScannerScreen from './TransferQRScannerScreen'

jest.mock('../../../api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    registration: { updateRegistration: jest.fn() },
    authorization: { authorizeDevice: jest.fn().mockResolvedValue(null) },
    deviceAttestation: { verifyAttestation: jest.fn().mockResolvedValue({ success: true }) },
    token: {
      deviceToken: jest.fn().mockResolvedValue({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    },
  })),
}))

describe('TransferQRScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <TransferQRScannerScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
