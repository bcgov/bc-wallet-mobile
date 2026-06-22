import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { initialState } from '@/store'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import EvidenceCaptureScreen from './EvidenceCaptureScreen'

// Module-level mock fns (must be `mock`-prefixed to be referenced inside jest.mock factories).
const mockHandleScanBarcodes = jest.fn()
const mockHandleScanDriversLicense = jest.fn()
const mockClearAdditionalEvidence = jest.fn()
const mockUpdateEvidenceMetadata = jest.fn()

jest.mock('react-native-vision-camera', () => ({
  useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn() }),
  // Pass the config straight through so the mocked camera can invoke onCodeScanned.
  useCodeScanner: (config: any) => config,
}))

jest.mock('@/hooks/useAutoRequestPermission', () => ({
  useAutoRequestPermission: () => ({ isLoading: false }),
}))

jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ failedToReadFromLocalStorageAlert: jest.fn() }),
}))

jest.mock('@/utils/alert', () => ({
  withAlert: (fn: any) => fn,
}))

jest.mock('@/bcsc-theme/utils/file-info', () => ({
  getPhotoMetadata: jest.fn(async () => ({
    label: '',
    content_type: 'image/jpeg',
    content_length: 1,
    date: 0,
    sha256: 'hash',
  })),
}))

jest.mock('@/bcsc-theme/hooks/useCardScanner', () => ({
  useCardScanner: () => ({
    // scanCard immediately resolves the scanned serial + licence so the screen's
    // refs are populated (simulating a combo/AAMVA card in the Non-BCSC flow).
    scanCard: jest.fn(async (_codes: any, cb: any) => {
      await cb('S00023254', { birthDate: new Date('1970-01-01'), licenseNumber: '123' })
    }),
    startScan: jest.fn(),
    completeScan: jest.fn(),
    handleScanComboCard: jest.fn(),
    handleScanBarcodes: mockHandleScanBarcodes,
    handleScanBCServicesCard: jest.fn(),
    handleScanDriversLicense: mockHandleScanDriversLicense,
    codeTypes: ['code-39', 'code-128', 'pdf-417'],
  }),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({
    clearAdditionalEvidence: mockClearAdditionalEvidence,
    updateEvidenceMetadata: mockUpdateEvidenceMetadata,
  }),
  useSecureActions: () => ({
    clearAdditionalEvidence: mockClearAdditionalEvidence,
    updateEvidenceMetadata: mockUpdateEvidenceMetadata,
  }),
}))

jest.mock('@/bcsc-theme/components/MaskedCamera', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactMock = require('react')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pressable, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ onPhotoTaken, codeScanner }: any) =>
      ReactMock.createElement(
        ReactMock.Fragment,
        null,
        ReactMock.createElement(
          Pressable,
          {
            testID: 'sim-scan',
            onPress: () =>
              codeScanner.onCodeScanned([
                { type: 'code-39', value: 'S00023254' },
                { type: 'pdf-417', value: 'dl-barcode' },
              ]),
          },
          ReactMock.createElement(Text, null, 'scan')
        ),
        ReactMock.createElement(
          Pressable,
          { testID: 'sim-photo', onPress: () => onPhotoTaken('/tmp/photo.jpg') },
          ReactMock.createElement(Text, null, 'photo')
        )
      ),
  }
})

jest.mock('@/bcsc-theme/components/PhotoReview', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactMock = require('react')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pressable, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ onAccept }: any) =>
      ReactMock.createElement(
        Pressable,
        { testID: 'sim-accept', onPress: onAccept },
        ReactMock.createElement(Text, null, 'accept')
      ),
  }
})

const mockCardType = {
  evidence_type: 'pr_card',
  image_sides: [{ side: 'FRONT', image_side_name: 'FRONT_SIDE', image_side_tip: 'tip', image_side_label: 'Front' }],
}

const mockTwoSidedCardType = {
  evidence_type: 'pr_card',
  image_sides: [
    { side: 'FRONT', image_side_name: 'FRONT_SIDE', image_side_tip: 'tip', image_side_label: 'Front' },
    { side: 'BACK', image_side_name: 'BACK_SIDE', image_side_tip: 'tip', image_side_label: 'Back' },
  ],
}

const renderScreen = (navigation: any, cardType: any = mockCardType) =>
  render(
    <BasicAppContext
      initialStateOverride={{ bcscSecure: { ...initialState.bcscSecure, cardProcess: BCSCCardProcess.NonBCSC } } as any}
    >
      <EvidenceCaptureScreen navigation={navigation} route={{ params: { cardType } } as never} />
    </BasicAppContext>
  )

const driveScanPhotoAccept = async (utils: ReturnType<typeof render>) => {
  await waitFor(() => utils.getByTestId('sim-scan'))
  await act(async () => {
    fireEvent.press(utils.getByTestId('sim-scan'))
  })
  await act(async () => {
    fireEvent.press(utils.getByTestId('sim-photo'))
  })
  const accept = await utils.findByTestId('sim-accept')
  await act(async () => {
    fireEvent.press(accept)
  })
}

describe('EvidenceCaptureScreen — Non-BCSC barcode flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reroutes into setup and clears evidence when the backend confirms a BC Services Card', async () => {
    mockHandleScanBarcodes.mockResolvedValue(true)
    const navigation = { navigate: jest.fn(), reset: jest.fn() }

    await driveScanPhotoAccept(renderScreen(navigation))

    await waitFor(() =>
      expect(mockHandleScanBarcodes).toHaveBeenCalledWith(
        'S00023254',
        expect.objectContaining({ licenseNumber: '123' })
      )
    )
    expect(mockClearAdditionalEvidence).toHaveBeenCalled()
    // Switched to the BCSC flow — does not continue to evidence ID collection.
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it('continues capturing as evidence (keeping the scanned barcode) when it is not a BC Services Card', async () => {
    mockHandleScanBarcodes.mockResolvedValue(false)
    const navigation = { navigate: jest.fn(), reset: jest.fn() }

    await driveScanPhotoAccept(renderScreen(navigation))

    await waitFor(() => expect(mockHandleScanBarcodes).toHaveBeenCalled())
    expect(mockClearAdditionalEvidence).not.toHaveBeenCalled()

    // Falls through to evidence capture; the scanned CODE_128 serial is preserved
    // in the upload (no longer dropped) and the user proceeds to ID collection.
    await waitFor(() => expect(mockUpdateEvidenceMetadata).toHaveBeenCalled())
    const barcodes = mockUpdateEvidenceMetadata.mock.calls[0][2]
    expect(barcodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'CODE_128', value: 'S00023254' })])
    )
    expect(navigation.navigate).toHaveBeenCalledWith(
      BCSCScreens.EvidenceIDCollection,
      expect.objectContaining({ documentNumber: '123' })
    )
  })

  it('asks /device/barcodes only once across a multi-sided card', async () => {
    mockHandleScanBarcodes.mockResolvedValue(false)
    const navigation = { navigate: jest.fn(), reset: jest.fn() }
    const utils = renderScreen(navigation, mockTwoSidedCardType)

    // Front side: scan, photo, accept.
    await waitFor(() => utils.getByTestId('sim-scan'))
    await act(async () => {
      fireEvent.press(utils.getByTestId('sim-scan'))
    })
    await act(async () => {
      fireEvent.press(utils.getByTestId('sim-photo'))
    })
    await act(async () => {
      fireEvent.press(await utils.findByTestId('sim-accept'))
    })

    // Back side: photo, accept — the barcodes are already captured, so no rescan.
    await act(async () => {
      fireEvent.press(await utils.findByTestId('sim-photo'))
    })
    await act(async () => {
      fireEvent.press(await utils.findByTestId('sim-accept'))
    })

    // The backend is asked once for the card, not once per side.
    expect(mockHandleScanBarcodes).toHaveBeenCalledTimes(1)
    expect(navigation.navigate).toHaveBeenCalledWith(
      BCSCScreens.EvidenceIDCollection,
      expect.objectContaining({ documentNumber: '123' })
    )
  })
})
