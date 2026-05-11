import * as Bifold from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import { useCameraPermission } from 'react-native-vision-camera'
import QRScanner from './QRScanner'

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  ScanCamera: jest.fn().mockReturnValue(null),
  SVGOverlay: jest.fn().mockReturnValue(null),
}))

jest.mock('@/bcsc-theme/components/PermissionDisabled', () => ({
  PermissionDisabled: () => 'PermissionDisabled',
}))

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon')

describe('QRScanner', () => {
  const mockRequestPermission = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useCameraPermission).mockReturnValue({
      hasPermission: true,
      requestPermission: mockRequestPermission,
    } as any)
  })

  const renderComponent = () =>
    render(
      <BasicAppContext>
        <QRScanner />
      </BasicAppContext>
    )

  it('renders the scanner when camera permission is granted', () => {
    renderComponent()
    expect(jest.mocked(Bifold.ScanCamera)).toHaveBeenCalled()
  })

  it('shows PermissionDisabled when camera permission is not granted', () => {
    jest.mocked(useCameraPermission).mockReturnValue({
      hasPermission: false,
      requestPermission: mockRequestPermission,
    } as any)
    const { toJSON } = renderComponent()
    expect(toJSON()).toBe('PermissionDisabled')
  })

  it('requests camera permission on mount when not already granted', () => {
    jest.mocked(useCameraPermission).mockReturnValue({
      hasPermission: false,
      requestPermission: mockRequestPermission,
    } as any)
    renderComponent()
    expect(mockRequestPermission).toHaveBeenCalled()
  })

  it('does not request permission if already granted', () => {
    renderComponent()
    expect(mockRequestPermission).not.toHaveBeenCalled()
  })

  it('passes torchActive true to ScanCamera after torch button press', () => {
    renderComponent()

    const scanCameraMock = jest.mocked(Bifold.ScanCamera)
    expect(scanCameraMock.mock.calls.at(-1)![0]).toMatchObject({ torchActive: false })

    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOn' }))

    expect(scanCameraMock.mock.calls.at(-1)![0]).toMatchObject({ torchActive: true })
  })

  it('toggles torch back off on second press', () => {
    renderComponent()
    const scanCameraMock = jest.mocked(Bifold.ScanCamera)

    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOn' }))
    fireEvent.press(screen.getByRole('button', { name: 'BCSC.Scan.TorchOff' }))

    expect(scanCameraMock.mock.calls.at(-1)![0]).toMatchObject({ torchActive: false })
  })
})
