import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet } from 'react-native'
import TransferQRScannerScreen from './TransferQRScannerScreen'

const mockNavigation = {
  navigate: jest.fn(),
  dispatch: jest.fn(),
} as any

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
        <TransferQRScannerScreen navigation={mockNavigation} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shrinks the instruction text to its widest rendered line so it centers with the reticle', () => {
    const { getByText } = render(
      <BasicAppContext>
        <TransferQRScannerScreen navigation={mockNavigation} />
      </BasicAppContext>
    )

    const message = getByText('BCSC.Scan.WillScanAutomatically')
    fireEvent(message, 'textLayout', { nativeEvent: { lines: [{ width: 156.5 }, { width: 120 }] } })

    expect(StyleSheet.flatten(message.props.style).width).toBe(157)
  })
})
