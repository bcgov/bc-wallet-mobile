import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import ScanSerialScreen from './ScanSerialScreen'

const mockHandleScanComboCard = jest.fn()
const mockCompleteScan = jest.fn()

// scanCard decodes whatever barcodes are handed to it for this test — the
// serial and license kinds are simulated directly via the mocked
// CodeScanningCamera below rather than real barcode decoding.
jest.mock('@/bcsc-theme/hooks/useCardScanner', () => ({
  useCardScanner: () => ({
    scanCard: jest.fn(async (codes: { type: string; value: string }[], cb: any) => {
      const serial = codes.find((c) => c.type === 'code-39')?.value ?? null
      const license = codes.find((c) => c.type === 'pdf-417')
        ? { birthDate: new Date('1970-01-01'), licenseNumber: '123' }
        : null
      await cb(serial, license)
    }),
    startScan: jest.fn(),
    completeScan: mockCompleteScan,
    handleScanComboCard: mockHandleScanComboCard,
    handleScanBarcodes: jest.fn(),
    handleScanBCServicesCard: jest.fn(),
    handleScanDriversLicense: jest.fn(),
    handleScanNonBcsc: jest.fn(),
    codeTypes: ['code-39', 'code-128', 'pdf-417'],
  }),
}))

jest.mock('react-native-vision-camera', () => ({
  useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn() }),
}))

jest.mock('@/hooks/useAutoRequestPermission', () => ({
  useAutoRequestPermission: () => ({ isLoading: false }),
}))

// Stub out the real camera + its lock/accumulate state machine — exposes a
// button that fires the screen's onCodeScanned with test-controlled barcodes,
// simulating two separate scan/lock cycles.
jest.mock('../../components/CodeScanningCamera', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactMock = require('react')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pressable, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ onCodeScanned }: any) =>
      ReactMock.createElement(
        ReactMock.Fragment,
        null,
        ReactMock.createElement(
          Pressable,
          {
            testID: 'sim-scan-serial',
            onPress: () => onCodeScanned([{ type: 'code-39', value: 'S00023254' }]),
          },
          ReactMock.createElement(Text, null, 'scan-serial')
        ),
        ReactMock.createElement(
          Pressable,
          {
            testID: 'sim-scan-license',
            onPress: () => onCodeScanned([{ type: 'pdf-417', value: 'dl-barcode' }]),
          },
          ReactMock.createElement(Text, null, 'scan-license')
        )
      ),
  }
})

describe('ScanSerialScreen combo scan flow', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('waits for both the serial and license before completing the scan', async () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <ScanSerialScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    // Only the serial has been read so far — must not complete yet.
    await act(async () => {
      fireEvent.press(getByTestId('sim-scan-serial'))
    })
    expect(mockCompleteScan).not.toHaveBeenCalled()
    expect(mockHandleScanComboCard).not.toHaveBeenCalled()

    // The license arrives on a later scan/lock cycle — now both are cached.
    await act(async () => {
      fireEvent.press(getByTestId('sim-scan-license'))
    })
    expect(mockCompleteScan).toHaveBeenCalledTimes(1)
    expect(mockHandleScanComboCard).toHaveBeenCalledWith(
      'S00023254',
      expect.objectContaining({ licenseNumber: '123' })
    )
  })
})
