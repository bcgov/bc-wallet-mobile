import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { DriversLicenseMetadata } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { getPhotoMetadata } from '@/bcsc-theme/utils/file-info'
import { isAxiosAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import * as AutoRequestPermissionHook from '@/hooks/useAutoRequestPermission'
import { initialBCSCSecureState } from '@/store'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess, PhotoMetadata } from 'react-native-bcsc-core'
import { useCameraPermission } from 'react-native-vision-camera'
import { BCSCScreens } from '../../../types/navigators'
import EvidenceCaptureScreen from './EvidenceCaptureScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')

// MaskedCamera reads appStateStatus from BCSCActivityContext, which BasicAppContext doesn't provide.
jest.mock('@/bcsc-theme/contexts/BCSCActivityContext', () => ({
  useBCSCActivity: jest.fn().mockReturnValue({
    appStateStatus: 'active',
    pauseActivityTracking: jest.fn(),
    resumeActivityTracking: jest.fn(),
  }),
}))

jest.mock('react-native-vision-camera', () => ({
  useCameraPermission: jest.fn(),
  useCodeScanner: jest.fn((config: unknown) => config),
}))

// Stub the real camera UI out entirely: this suite exercises the screen's own state machine
// (capturing -> reviewing -> accept/retake, barcode handling) rather than MaskedCamera's
// rendering, which has its own test file. Capturing the props it receives lets tests drive
// onPhotoTaken/codeScanner directly instead of poking at a fake camera UI.
let maskedCameraProps: any = null
jest.mock('@/bcsc-theme/components/MaskedCamera', () => ({
  __esModule: true,
  default: (props: any) => {
    maskedCameraProps = props
    return null
  },
}))

const mockScanCard = jest.fn()
const mockHandleScanBarcodes = jest.fn()
const mockHandleScanDriversLicense = jest.fn()
jest.mock('@/bcsc-theme/hooks/useCardScanner', () => ({
  useCardScanner: jest.fn(() => ({
    codeTypes: [],
    scanCard: mockScanCard,
    handleScanBarcodes: mockHandleScanBarcodes,
    handleScanDriversLicense: mockHandleScanDriversLicense,
  })),
}))

const mockClearAdditionalEvidence = jest.fn().mockResolvedValue(undefined)
const mockUpdateEvidenceMetadata = jest.fn().mockResolvedValue(undefined)
const mockTruncateEvidence = jest.fn().mockResolvedValue(undefined)
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    clearAdditionalEvidence: mockClearAdditionalEvidence,
    updateEvidenceMetadata: mockUpdateEvidenceMetadata,
    truncateEvidence: mockTruncateEvidence,
  })),
}))

const mockDocumentExpiredAlert = jest.fn()
const mockFailedToReadFromLocalStorageAlert = jest.fn()
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: jest.fn(() => ({
    documentExpiredAlert: mockDocumentExpiredAlert,
    failedToReadFromLocalStorageAlert: mockFailedToReadFromLocalStorageAlert,
  })),
}))

jest.mock('@/bcsc-theme/utils/file-info', () => ({
  getPhotoMetadata: jest.fn(),
}))

jest.mock('@/errors/appError', () => ({
  ...jest.requireActual('@/errors/appError'),
  isAxiosAppError: jest.fn(),
}))

const mockUseCameraPermission = useCameraPermission as jest.Mock
const mockGetPhotoMetadata = getPhotoMetadata as jest.Mock
const mockIsAxiosAppError = jest.mocked(isAxiosAppError)

const buildPhotoMetadata = (): PhotoMetadata => ({
  label: '',
  content_type: 'image/jpeg',
  content_length: 1234,
  date: 1700000000,
  sha256: 'abc123',
  filename: 'photo.jpg',
  file_path: 'mock/photo/path.jpg',
})

const frontSide = {
  side: 'FRONT',
  image_side_name: 'FRONT_SIDE',
  image_side_label: 'Front',
  image_side_tip: 'Front tip',
}
const backSide = {
  side: 'BACK',
  image_side_name: 'BACK_SIDE',
  image_side_label: 'Back',
  image_side_tip: 'Back tip',
}

const buildEvidenceType = (imageSides: unknown[]) => ({
  evidence_type: 'passport',
  has_photo: true,
  group: 'OTHER COUNTRIES' as const,
  group_sort_order: 1,
  sort_order: 1,
  collection_order: 'FIRST' as const,
  document_reference_input_mask: '[0-9]{9}',
  document_reference_label: 'Passport Number',
  document_reference_sample: '123456789',
  image_sides: imageSides,
  evidence_type_label: 'Passport',
})

const mockLicense: DriversLicenseMetadata = {
  licenseNumber: '1234567',
  firstName: 'Jane',
  middleNames: '',
  lastName: 'Doe',
  birthDate: new Date('1990-01-01'),
  expiryDate: new Date('2030-01-01'),
  streetAddress: '123 Main St',
  city: 'Victoria',
  province: 'BC',
  postalCode: 'V8V8V8',
  isoIIN: '636028',
}

describe('EvidenceCapture', () => {
  let mockNavigation: any

  // Wrapped in BCSCLoadingProvider: useAutoRequestPermission renders <LoadingScreen /> (which
  // needs it) for at least the first tick whenever hasPermission starts out false.
  const renderScreen = (cardType: unknown, stateOverride?: Record<string, unknown>) =>
    render(
      <BasicAppContext initialStateOverride={stateOverride as never}>
        <BCSCLoadingProvider>
          <EvidenceCaptureScreen
            navigation={mockNavigation as never}
            route={{ params: { cardType } } as never}
          />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    maskedCameraProps = null
    mockUseCameraPermission.mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn().mockResolvedValue(true),
    })
    mockGetPhotoMetadata.mockImplementation(async () => buildPhotoMetadata())
    mockScanCard.mockImplementation(async () => {})
  })

  afterEach(() => {
    // Restores the useAutoRequestPermission spy (below) to its real implementation — jest.clearAllMocks()
    // only clears call history, not a jest.spyOn's mocked return value, so it would otherwise leak into
    // every later test and permanently stick the screen in its loading state.
    jest.restoreAllMocks()
  })

  it('renders the capture view once camera permission is available', async () => {
    const tree = renderScreen(buildEvidenceType([frontSide]))

    await waitFor(() =>
      expect(tree.getByTestId(testIdWithKey('EvidenceCaptureScreenMaskedCamera'))).toBeTruthy()
    )
    expect(maskedCameraProps.cameraLabel).toBe(frontSide.image_side_label)
  })

  it('renders nothing when no current side to capture', async () => {
    const tree = renderScreen(buildEvidenceType([]))

    await waitFor(() => {
      const testId = tree.queryByTestId(testIdWithKey('EvidenceCaptureScreenMaskedCamera'))
      const photoReviewId = tree.queryByTestId(testIdWithKey('RetakePhoto'))
      expect(testId).toBeNull()
      expect(photoReviewId).toBeNull()
    })
  })

  it('renders loading screen when permissions are loading', async () => {
    jest.spyOn(AutoRequestPermissionHook, 'useAutoRequestPermission').mockReturnValue({ isLoading: true })

    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <EvidenceCaptureScreen
            navigation={mockNavigation as never}
            route={{ params: { cardType: buildEvidenceType([frontSide]) } } as never}
          />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    await waitFor(() => {
      const testId = tree.getByTestId(testIdWithKey('LoadingScreenContent'))
      expect(testId).toBeDefined()
    })
  })

  it('renders PermissionDisabled when camera permission is not granted', async () => {
    mockUseCameraPermission.mockReturnValue({
      hasPermission: false,
      requestPermission: jest.fn().mockResolvedValue(false),
    })

    const tree = renderScreen(buildEvidenceType([frontSide]))

    await waitFor(() => expect(tree.getByTestId(testIdWithKey('OpenSettings'))).toBeTruthy())
  })

  it('ignores code scans with no codes', async () => {
    renderScreen(buildEvidenceType([frontSide]))
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())

    await act(async () => {
      await maskedCameraProps.codeScanner.onCodeScanned([])
    })

    expect(mockScanCard).not.toHaveBeenCalled()
  })

  it('ignores further scans once both serial and license are already captured', async () => {
    mockScanCard.mockImplementation(async (_codes: unknown, callback: (serial?: string, license?: unknown) => void) => {
      callback('SERIAL123', mockLicense)
    })

    renderScreen(buildEvidenceType([frontSide]))
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())

    await act(async () => {
      await maskedCameraProps.codeScanner.onCodeScanned([{ value: 'abc' }])
    })
    expect(mockScanCard).toHaveBeenCalledTimes(1)

    await act(async () => {
      await maskedCameraProps.codeScanner.onCodeScanned([{ value: 'abc' }])
    })
    expect(mockScanCard).toHaveBeenCalledTimes(1)
  })

  it('shows the photo review screen after a photo is taken', async () => {
    const tree = renderScreen(buildEvidenceType([frontSide]))
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())

    act(() => {
      maskedCameraProps.onPhotoTaken('mock/photo/path.jpg')
    })

    await waitFor(() => expect(tree.getByTestId(testIdWithKey('UsePhoto'))).toBeTruthy())
    expect(tree.queryByTestId(testIdWithKey('EvidenceCaptureScreenMaskedCamera'))).toBeNull()
  })

  it('returns to capturing when the photo is retaken', async () => {
    const tree = renderScreen(buildEvidenceType([frontSide]))
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())

    act(() => {
      maskedCameraProps.onPhotoTaken('mock/photo/path.jpg')
    })
    await waitFor(() => expect(tree.getByTestId(testIdWithKey('RetakePhoto'))).toBeTruthy())

    fireEvent.press(tree.getByTestId(testIdWithKey('RetakePhoto')))

    await waitFor(() => expect(tree.getByTestId(testIdWithKey('EvidenceCaptureScreenMaskedCamera'))).toBeTruthy())
    expect(tree.queryByTestId(testIdWithKey('UsePhoto'))).toBeNull()
  })

  it('advances to the next side without submitting when accepting a non-last photo', async () => {
    const tree = renderScreen(buildEvidenceType([frontSide, backSide]))
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())
    expect(maskedCameraProps.cameraLabel).toBe(frontSide.image_side_label)

    act(() => {
      maskedCameraProps.onPhotoTaken('mock/front.jpg')
    })
    await waitFor(() => expect(tree.getByTestId(testIdWithKey('UsePhoto'))).toBeTruthy())

    await fireEvent.press(tree.getByTestId(testIdWithKey('UsePhoto')))

    expect(mockUpdateEvidenceMetadata).not.toHaveBeenCalled()
    expect(mockNavigation.push).not.toHaveBeenCalled()
    await waitFor(() => expect(maskedCameraProps.cameraLabel).toBe(backSide.image_side_label))
  })

  it('submits evidence metadata and navigates to ID collection on the last side', async () => {
    const cardType = buildEvidenceType([frontSide])
    const tree = renderScreen(cardType)
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())

    act(() => {
      maskedCameraProps.onPhotoTaken('mock/front.jpg')
    })
    await waitFor(() => expect(tree.getByTestId(testIdWithKey('UsePhoto'))).toBeTruthy())

    await fireEvent.press(tree.getByTestId(testIdWithKey('UsePhoto')))

    await waitFor(() =>
      expect(mockUpdateEvidenceMetadata).toHaveBeenCalledWith(
        cardType,
        [expect.objectContaining({ label: frontSide.image_side_name })],
        undefined
      )
    )
    expect(mockNavigation.push).toHaveBeenCalledWith(BCSCScreens.EvidenceIDCollection, {
      cardType,
      documentNumber: undefined,
    })
  })

  it('calls handleScanDriversLicense when a license was scanned before accepting', async () => {
    mockScanCard.mockImplementation(async (_codes: unknown, callback: (serial?: string, license?: unknown) => void) => {
      callback(undefined, mockLicense)
    })

    const tree = renderScreen(buildEvidenceType([frontSide]))
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())

    await act(async () => {
      await maskedCameraProps.codeScanner.onCodeScanned([{ value: 'dl' }])
    })

    act(() => {
      maskedCameraProps.onPhotoTaken('mock/front.jpg')
    })
    await waitFor(() => expect(tree.getByTestId(testIdWithKey('UsePhoto'))).toBeTruthy())

    await fireEvent.press(tree.getByTestId(testIdWithKey('UsePhoto')))

    expect(mockHandleScanDriversLicense).toHaveBeenCalledWith(mockLicense)
  })

  it('clears additional evidence when scanned barcodes switch the user to BCSC (Non-BCSC flow)', async () => {
    mockScanCard.mockImplementation(async (_codes: unknown, callback: (serial?: string, license?: unknown) => void) => {
      callback('SERIAL123', mockLicense)
    })
    mockHandleScanBarcodes.mockResolvedValue(true)

    const tree = renderScreen(buildEvidenceType([frontSide]), {
      bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.NonBCSC },
    })
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())

    await act(async () => {
      await maskedCameraProps.codeScanner.onCodeScanned([{ value: 'combo' }])
    })

    act(() => {
      maskedCameraProps.onPhotoTaken('mock/front.jpg')
    })
    await waitFor(() => expect(tree.getByTestId(testIdWithKey('UsePhoto'))).toBeTruthy())

    await fireEvent.press(tree.getByTestId(testIdWithKey('UsePhoto')))

    expect(mockHandleScanBarcodes).toHaveBeenCalledWith('SERIAL123', mockLicense)
    expect(mockClearAdditionalEvidence).toHaveBeenCalled()
  })

  it('removes the expired card entry and returns to the evidence list on a 400 card-expired error (Non-BCSC flow)', async () => {
    mockScanCard.mockImplementation(async (_codes: unknown, callback: (serial?: string, license?: unknown) => void) => {
      callback('SERIAL123', mockLicense)
    })
    const cardExpiredError = Object.assign(new Error('card expired'), {
      cause: { message: AppEventCode.CARD_EXPIRED },
    })
    mockHandleScanBarcodes.mockRejectedValue(cardExpiredError)
    mockIsAxiosAppError.mockReturnValue(true)

    const existingEvidence = [
      { evidenceType: { evidence_type: 'first' }, metadata: [] },
      { evidenceType: { evidence_type: 'second' }, metadata: [] },
    ]

    const tree = renderScreen(buildEvidenceType([frontSide]), {
      bcscSecure: {
        ...initialBCSCSecureState,
        cardProcess: BCSCCardProcess.NonBCSC,
        additionalEvidenceData: existingEvidence,
      },
    })
    await waitFor(() => expect(maskedCameraProps).not.toBeNull())

    await act(async () => {
      await maskedCameraProps.codeScanner.onCodeScanned([{ value: 'combo' }])
    })

    act(() => {
      maskedCameraProps.onPhotoTaken('mock/front.jpg')
    })
    await waitFor(() => expect(tree.getByTestId(testIdWithKey('UsePhoto'))).toBeTruthy())

    await fireEvent.press(tree.getByTestId(testIdWithKey('UsePhoto')))

    await waitFor(() =>
      expect(mockTruncateEvidence).toHaveBeenCalledWith(existingEvidence, existingEvidence.length - 1)
    )
    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.EvidenceTypeList, {
      cardProcess: BCSCCardProcess.NonBCSC,
    })
    expect(mockDocumentExpiredAlert).toHaveBeenCalled()
  })
})
