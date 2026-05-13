import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { initialBCSCSecureState } from '@/store'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess, EvidenceType } from 'react-native-bcsc-core'
import EvidenceIDCollectionScreen from './EvidenceIDCollectionScreen'

jest.mock('@/bcsc-theme/hooks/useDataLoader')
jest.mock('@/bcsc-theme/hooks/useSecureActions')

const mockUseDataLoader = useDataLoader as jest.Mock
const mockUseSecureActions = useSecureActions as jest.Mock

const mockAddEvidenceType = jest.fn().mockResolvedValue(undefined)
const mockUpdateEvidenceMetadata = jest.fn().mockResolvedValue(undefined)
const mockUpdateEvidenceDocumentNumber = jest.fn().mockResolvedValue(undefined)
const mockUpdateUserInfo = jest.fn().mockResolvedValue(undefined)
const mockUpdateUserMetadata = jest.fn().mockResolvedValue(undefined)

const makeEvidenceType = (overrides: Partial<EvidenceType> = {}): EvidenceType => ({
  evidence_type: 'BC Drivers Licence',
  has_photo: true,
  group: 'BRITISH COLUMBIA',
  group_sort_order: 1,
  sort_order: 1,
  collection_order: 'BOTH',
  document_reference_input_mask: '',
  document_reference_label: 'Driver\'s License Number',
  document_reference_sample: '12345678',
  image_sides: [],
  evidence_type_label: "B.C. Driver's Licence",
  ...overrides,
})

const mockMetadata = (evidenceTypes: EvidenceType[], process: string = BCSCCardProcess.BCSCNonPhoto) => ({
  processes: [{ process, evidence_types: evidenceTypes }],
})

describe('EvidenceIDCollection', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    mockUseSecureActions.mockReturnValue({
      addEvidenceType: mockAddEvidenceType,
      updateEvidenceMetadata: mockUpdateEvidenceMetadata,
      updateEvidenceDocumentNumber: mockUpdateEvidenceDocumentNumber,
      updateUserInfo: mockUpdateUserInfo,
      updateUserMetadata: mockUpdateUserMetadata,
    })
    mockUseDataLoader.mockReturnValue({
      data: mockMetadata([makeEvidenceType()]),
      isLoading: false,
      load: jest.fn(),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly with the type-of-ID dropdown', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.BCSCNonPhoto },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { photoPath: '/tmp/photo.jpg' } } as never}
        />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('does not render the document number input until a type is selected', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.BCSCNonPhoto },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { photoPath: '/tmp/photo.jpg' } } as never}
        />
      </BasicAppContext>
    )

    expect(tree.queryByTestId('com.ariesbifold:id/documentNumber-input')).toBeNull()
  })

  it('renders the type-of-ID dropdown trigger', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.BCSCNonPhoto },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { photoPath: '/tmp/photo.jpg' } } as never}
        />
      </BasicAppContext>
    )

    expect(tree.getByTestId('com.ariesbifold:id/evidenceType-input')).toBeTruthy()
  })

  it('shows a type-of-ID error when submitting without a selection', async () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.BCSCNonPhoto },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { photoPath: '/tmp/photo.jpg' } } as never}
        />
      </BasicAppContext>
    )

    await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

    expect(tree.queryByTestId('com.ariesbifold:id/evidenceType-error')).toBeTruthy()
    expect(mockAddEvidenceType).not.toHaveBeenCalled()
  })
})
