import { act, fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'

import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { useFocusEffect } from '@react-navigation/native'
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
jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: jest.fn(() => ({ isErrorModalVisible: false })),
}))

jest.mock('react-native-vision-camera', () => ({ useCameraPermission: jest.fn() }))
jest.mock('@/hooks/useAutoRequestPermission', () => ({ useAutoRequestPermission: jest.fn() }))

const mockUseCameraPermission = useCameraPermission as jest.Mock
const mockUseAutoRequestPermission = useAutoRequestPermission as jest.Mock
const mockUseFocusEffect = useFocusEffect as jest.Mock
const mockCameraMounted = jest.fn()

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
    // Counts real mounts so a key-driven remount of ScanCamera is observable
    Bifold.ScanCamera.mockImplementation(() => {
      React.useEffect(() => {
        mockCameraMounted()
      }, [])
      return null
    })
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

  // ScanCamera freezes itself after a scan, so only a refocus (not the first focus) may remount it.
  it('remounts ScanCamera on refocus but not on the first focus', () => {
    render(<QRScanner {...defaultProps} />)
    expect(mockCameraMounted).toHaveBeenCalledTimes(1)

    const onFocus = mockUseFocusEffect.mock.calls.at(-1)![0] as () => void

    act(() => onFocus())
    expect(mockCameraMounted).toHaveBeenCalledTimes(1)

    act(() => onFocus())
    expect(mockCameraMounted).toHaveBeenCalledTimes(2)
  })

  // Remounting mid-scan resets ScanCamera's duplicate-scan guard, so the same QR in frame would fire again.
  it('does not remount ScanCamera on refocus while a scan is processing', () => {
    const { rerender } = render(<QRScanner {...defaultProps} />)
    const onFocus = mockUseFocusEffect.mock.calls.at(-1)![0] as () => void

    act(() => onFocus()) // first focus

    rerender(<QRScanner {...defaultProps} isProcessing />)
    act(() => onFocus())
    expect(mockCameraMounted).toHaveBeenCalledTimes(1)

    rerender(<QRScanner {...defaultProps} />)
    act(() => onFocus())
    expect(mockCameraMounted).toHaveBeenCalledTimes(2)
  })

  // ScanCamera freezes itself after a scan, so closing any global error modal has to remount it.
  it('remounts ScanCamera only once the error modal closes and the rescan delay passes', () => {
    jest.useFakeTimers()
    try {
      const mockUseErrorAlert = jest.mocked(useErrorAlert)
      mockUseErrorAlert.mockReturnValue({ isErrorModalVisible: true } as unknown as ReturnType<typeof useErrorAlert>)

      const { rerender } = render(<QRScanner {...defaultProps} />)
      rerender(<QRScanner {...defaultProps} />)
      act(() => jest.runOnlyPendingTimers())
      expect(mockCameraMounted).toHaveBeenCalledTimes(1) // still open, so still frozen

      mockUseErrorAlert.mockReturnValue({ isErrorModalVisible: false } as unknown as ReturnType<typeof useErrorAlert>)
      rerender(<QRScanner {...defaultProps} />)
      expect(mockCameraMounted).toHaveBeenCalledTimes(1) // closed, but the delay hasn't passed

      act(() => jest.runOnlyPendingTimers())
      expect(mockCameraMounted).toHaveBeenCalledTimes(2)
    } finally {
      jest.useRealTimers()
    }
  })

  it('does not remount ScanCamera if the screen unmounts before the rescan delay passes', () => {
    jest.useFakeTimers()
    try {
      const mockUseErrorAlert = jest.mocked(useErrorAlert)
      mockUseErrorAlert.mockReturnValue({ isErrorModalVisible: true } as unknown as ReturnType<typeof useErrorAlert>)

      const { rerender, unmount } = render(<QRScanner {...defaultProps} />)

      mockUseErrorAlert.mockReturnValue({ isErrorModalVisible: false } as unknown as ReturnType<typeof useErrorAlert>)
      rerender(<QRScanner {...defaultProps} />)
      unmount()
      act(() => jest.runOnlyPendingTimers())

      expect(mockCameraMounted).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })
})
