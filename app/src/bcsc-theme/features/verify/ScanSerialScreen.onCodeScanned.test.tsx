import { BC_DL_BARCODE_S } from '@/bcsc-theme/utils/__fixtures__/barcodes'
import { ScanableCode } from '@/bcsc-theme/utils/card-barcode-decoder'
import { bifoldLoggerInstance } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render } from '@testing-library/react-native'
import React from 'react'
import ScanSerialScreen from './ScanSerialScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')

const mockHandleScanNonBcsc = jest.fn()
const mockHandleScanComboCard = jest.fn()
jest.mock('@/bcsc-theme/hooks/useCardScanner', () => ({
  useCardScanner: () => ({
    handleScanNonBcsc: mockHandleScanNonBcsc,
    handleScanComboCard: mockHandleScanComboCard,
  }),
}))

// Hands the screen's onCodeScanned to the test, so the real decoder runs without a camera.
const mockCamera: { onCodeScanned?: (codes: ScanableCode[]) => Promise<void | boolean> } = {}
jest.mock('../../components/CodeScanningCamera', () => ({
  __esModule: true,
  default: (props: { onCodeScanned: (codes: ScanableCode[]) => Promise<void | boolean> }) => {
    mockCamera.onCodeScanned = props.onCodeScanned
    return null
  },
}))

jest.mock('react-native-vision-camera', () => ({
  useCameraPermission: jest.fn(() => ({ hasPermission: true, requestPermission: jest.fn() })),
}))

jest.mock('../../contexts/BCSCLoadingContext', () => ({
  ...jest.requireActual('../../contexts/BCSCLoadingContext'),
  LoadingScreen: () => null,
}))

describe('ScanSerialScreen onCodeScanned', () => {
  // The container's init() swaps in this shared logger, whatever BasicAppContext registers.
  const debugSpy = jest.spyOn(bifoldLoggerInstance, 'debug').mockImplementation(() => undefined)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    debugSpy.mockRestore()
  })

  it('skips an unknown code and keeps scanning instead of treating the card as non-BCSC', async () => {
    render(
      <BasicAppContext>
        <ScanSerialScreen navigation={useNavigation() as never} />
      </BasicAppContext>
    )

    const unknownCode: ScanableCode = { type: 'unknown', value: 'UNKNOWN-VALUE-1' }
    const licence: ScanableCode = { type: 'pdf-417', value: BC_DL_BARCODE_S }
    const damaged: ScanableCode = { type: 'pdf-417', value: BC_DL_BARCODE_S.replace('00S00023254?', 'S00023254?') }

    let accepted: void | boolean = undefined
    await act(async () => {
      accepted = await mockCamera.onCodeScanned?.([unknownCode, licence, damaged])
    })

    // The licence gives a birth date but no serial, so the camera keeps scanning.
    expect(accepted).toBe(false)
    expect(mockHandleScanNonBcsc).not.toHaveBeenCalled()
    expect(mockHandleScanComboCard).not.toHaveBeenCalled()

    const loggedArguments = JSON.stringify(debugSpy.mock.calls)
    for (const sensitive of ['UNKNOWN-VALUE-1', BC_DL_BARCODE_S, 'S00023254', 'SPECIMEN', 'specimen', '2222222']) {
      expect(loggedArguments).not.toContain(sensitive)
    }
    expect(loggedArguments).toContain('"reason":"damaged"')
  })
})
