import { render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import NfcManager from 'react-native-nfc-manager'

import NfcScanner from './NfcScanner'
import useScanScreenViewModel from './useScanScreenViewModel'

jest.mock('@bifold/core', () => ({
  DismissiblePopupModal: ({ description }: any) => description ?? null,
  testIdWithKey: (k: string) => `id/${k}`,
  useTheme: () => ({
    ColorPalette: { grayscale: { white: '#fff', black: '#000' } },
    Spacing: { sm: 4, md: 8, lg: 16 },
    TextTheme: { normal: {} },
  }),
}))

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon')

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ getParent: () => ({ navigate: jest.fn() }), navigate: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // Eagerly invoke once on mount to mimic the focus-effect's initial fire.
    cb()
  },
}))

jest.mock('./useScanScreenViewModel', () => jest.fn())

const mockUseScanScreenViewModel = useScanScreenViewModel as unknown as jest.MockedFunction<
  typeof useScanScreenViewModel
>

// NfcScanner only reads isProcessing/scanError/handleScan/dismissError/resetNavigationLock off
// the shared view model, but its return type also carries isPermissionLoading/hasPermission
// (QRScanner's camera-permission fields) — included here only to satisfy that shared type.
const defaultViewModelState = {
  isPermissionLoading: false,
  hasPermission: true,
  isProcessing: false,
  scanError: null,
  handleScan: jest.fn(),
  dismissError: jest.fn(),
  resetNavigationLock: jest.fn(),
}

const mockNfcManager = NfcManager as unknown as {
  isSupported: jest.MockedFunction<() => Promise<boolean>>
  start: jest.Mock
}

describe('NfcScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseScanScreenViewModel.mockReturnValue(defaultViewModelState)
  })

  it('shows the ready message once NFC support is confirmed', async () => {
    mockNfcManager.isSupported.mockResolvedValue(true)
    render(<NfcScanner />)
    await waitFor(() => expect(screen.getByText('BCSC.Scan.NfcReady')).toBeTruthy())
    expect(mockNfcManager.start).toHaveBeenCalled()
  })

  it('shows an unsupported message when the device has no NFC hardware', async () => {
    mockNfcManager.isSupported.mockResolvedValue(false)
    render(<NfcScanner />)
    await waitFor(() => expect(screen.getByText('BCSC.Scan.NfcNotSupported')).toBeTruthy())
    expect(mockNfcManager.start).not.toHaveBeenCalled()
  })

  it('passes onConnectionFound and onPairingCodeFound to the view model', () => {
    mockNfcManager.isSupported.mockResolvedValue(true)
    render(<NfcScanner />)
    expect(mockUseScanScreenViewModel).toHaveBeenCalledWith(
      expect.objectContaining({ onConnectionFound: expect.any(Function), onPairingCodeFound: expect.any(Function) })
    )
  })
})
