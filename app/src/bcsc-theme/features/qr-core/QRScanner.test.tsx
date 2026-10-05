import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'

import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { useCameraPermission } from 'react-native-vision-camera'
import QRScanner from './QRScanner'

jest.mock('@bifold/core', () => ({
  ScanCamera: jest.fn().mockReturnValue(null),
  ThemedText: ({ children, ...props }: any) => {
    const ActualReact = jest.requireActual('react')
    const { Text } = jest.requireActual('react-native')
    return ActualReact.createElement(Text, props, children)
  },
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

jest.mock('react-native-vision-camera', () => ({ useCameraPermission: jest.fn() }))
jest.mock('@/hooks/useAutoRequestPermission', () => ({ useAutoRequestPermission: jest.fn() }))

const mockUseCameraPermission = useCameraPermission as jest.Mock
const mockUseAutoRequestPermission = useAutoRequestPermission as jest.Mock

const defaultProps = {
  isProcessing: false,
  scanError: null,
  onScan: jest.fn(),
  onDismissError: jest.fn(),
}

const Bifold = jest.requireMock('@bifold/core') as { ScanCamera: jest.Mock }

describe('QRScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCameraPermission.mockReturnValue({ hasPermission: true, requestPermission: jest.fn() })
    mockUseAutoRequestPermission.mockReturnValue({ isLoading: false })
  })

  it('renders the scanner when camera permission is granted', () => {
    render(<QRScanner {...defaultProps} />)
    expect(Bifold.ScanCamera).toHaveBeenCalled()
  })

  it('shows the scan instructions inside the scanner frame', () => {
    render(<QRScanner {...defaultProps} />)
    expect(screen.getByText('BCSC.Scan.WillScanAutomatically')).toBeTruthy()
  })

  it('shows PermissionDisabled when camera permission is not granted', () => {
    mockUseCameraPermission.mockReturnValue({ hasPermission: false, requestPermission: jest.fn() })
    const { toJSON } = render(<QRScanner {...defaultProps} />)
    expect(toJSON()).toBe('PermissionDisabled')
  })

  it('shows LoadingScreen while permission is being requested', () => {
    mockUseAutoRequestPermission.mockReturnValue({ isLoading: true })
    const { toJSON } = render(<QRScanner {...defaultProps} />)
    expect(toJSON()).toBe('LoadingScreen')
  })

  it('passes torchActive true to ScanCamera after torch button press', () => {
    render(<QRScanner {...defaultProps} />)
    expect(Bifold.ScanCamera.mock.calls.at(-1)![0]).toMatchObject({ torchActive: false })

    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOn' }))

    expect(Bifold.ScanCamera.mock.calls.at(-1)![0]).toMatchObject({ torchActive: true })
  })

  it('toggles torch back off on second press', () => {
    render(<QRScanner {...defaultProps} />)

    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOn' }))
    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOff' }))

    expect(Bifold.ScanCamera.mock.calls.at(-1)![0]).toMatchObject({ torchActive: false })
  })

  // ScanCamera owns the per-frame dedupe ref. Unmounting it during processing
  // would reset that ref and let the same QR re-fire as a duplicate scan.
  it('keeps ScanCamera mounted while isProcessing is true', () => {
    render(<QRScanner {...defaultProps} isProcessing />)
    expect(Bifold.ScanCamera).toHaveBeenCalled()
  })
})
