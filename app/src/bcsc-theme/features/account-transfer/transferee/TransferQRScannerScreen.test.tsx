import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import * as useAlertsModule from '@/hooks/useAlerts'
import { BasicAppContext } from '@mocks/helpers/app'
import { CommonActions } from '@react-navigation/native'
import { act, render } from '@testing-library/react-native'
import React from 'react'
import * as pairingCodeStrategyModule from '../../qr-core/qr-code-strategies/usePairingCodeQRCodeStrategy'
import TransferQRScannerScreen from './TransferQRScannerScreen'

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')

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

  it('shows the website login alert and returns to account setup when a pairing code is scanned', () => {
    const pairingCodeScannedDuringTransferAlert = jest.fn()
    jest
      .spyOn(useAlertsModule, 'useAlerts')
      .mockReturnValue({ pairingCodeScannedDuringTransferAlert } as unknown as useAlertsModule.AppAlerts)
    const pairingCodeStrategySpy = jest.spyOn(pairingCodeStrategyModule, 'usePairingCodeQRCodeStrategy')

    render(
      <BasicAppContext>
        <TransferQRScannerScreen navigation={mockNavigation} />
      </BasicAppContext>
    )
    const onPairingCodeScanned = pairingCodeStrategySpy.mock.calls.at(-1)![0]
    act(() => onPairingCodeScanned('ABC123'))

    expect(pairingCodeScannedDuringTransferAlert).toHaveBeenCalledTimes(1)
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.AccountSetup }] })
    )
    expect(mockNavigation.navigate).not.toHaveBeenCalled()
  })
})
