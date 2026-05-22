import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'

import QRScanner from './QRScanner'
import useScanScreenViewModel from './useScanScreenViewModel'

jest.mock('@bifold/core', () => ({
  ScanCamera: jest.fn().mockReturnValue(null),
  SVGOverlay: jest.fn().mockReturnValue(null),
  MaskType: { QR_CODE: 'QR_CODE' },
  ThemedText: ({ children }: any) => children,
  DismissiblePopupModal: ({ description }: any) => description ?? null,
  testIdWithKey: (k: string) => `id/${k}`,
  useTheme: () => ({
    ColorPalette: { grayscale: { white: '#fff', black: '#000' } },
    Spacing: { sm: 4, md: 8, lg: 16 },
  }),
}))

jest.mock('@/bcsc-theme/components/PermissionDisabled', () => ({
  PermissionDisabled: () => 'PermissionDisabled',
}))

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  LoadingScreen: () => 'LoadingScreen',
}))

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon')

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ getParent: () => ({ navigate: jest.fn() }) }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // Eagerly invoke once on mount to mimic the focus-effect's initial fire.
    cb()
  },
}))

jest.mock('./useScanScreenViewModel', () => jest.fn())

const mockUseScanScreenViewModel = useScanScreenViewModel as unknown as jest.MockedFunction<
  typeof useScanScreenViewModel
>

const defaultViewModelState = {
  isPermissionLoading: false,
  hasPermission: true,
  isProcessing: false,
  scanError: null,
  handleScan: jest.fn(),
  dismissError: jest.fn(),
  resetNavigationLock: jest.fn(),
}

const Bifold = jest.requireMock('@bifold/core') as { ScanCamera: jest.Mock }

describe('QRScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseScanScreenViewModel.mockReturnValue(defaultViewModelState)
  })

  it('renders the scanner when camera permission is granted', () => {
    render(<QRScanner />)
    expect(Bifold.ScanCamera).toHaveBeenCalled()
  })

  it('shows PermissionDisabled when camera permission is not granted', () => {
    mockUseScanScreenViewModel.mockReturnValue({ ...defaultViewModelState, hasPermission: false })
    const { toJSON } = render(<QRScanner />)
    expect(toJSON()).toBe('PermissionDisabled')
  })

  it('shows LoadingScreen while permission is being requested', () => {
    mockUseScanScreenViewModel.mockReturnValue({ ...defaultViewModelState, isPermissionLoading: true })
    const { toJSON } = render(<QRScanner />)
    expect(toJSON()).toBe('LoadingScreen')
  })

  it('passes torchActive true to ScanCamera after torch button press', () => {
    render(<QRScanner />)
    expect(Bifold.ScanCamera.mock.calls.at(-1)![0]).toMatchObject({ torchActive: false })

    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOn' }))

    expect(Bifold.ScanCamera.mock.calls.at(-1)![0]).toMatchObject({ torchActive: true })
  })

  it('toggles torch back off on second press', () => {
    render(<QRScanner />)

    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOn' }))
    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOff' }))

    expect(Bifold.ScanCamera.mock.calls.at(-1)![0]).toMatchObject({ torchActive: false })
  })

  it('passes onConnectionFound to the view model', () => {
    render(<QRScanner />)
    expect(mockUseScanScreenViewModel).toHaveBeenCalledWith(
      expect.objectContaining({ onConnectionFound: expect.any(Function) })
    )
  })

  // ScanCamera owns the per-frame dedupe ref. Unmounting it during processing
  // would reset that ref and let the same QR re-fire as a duplicate scan.
  it('keeps ScanCamera mounted while isProcessing is true', () => {
    mockUseScanScreenViewModel.mockReturnValue({ ...defaultViewModelState, isProcessing: true })
    render(<QRScanner />)
    expect(Bifold.ScanCamera).toHaveBeenCalled()
  })
})
