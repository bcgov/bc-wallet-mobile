import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { initialState } from '@/store'
import { useServices, useStore } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import * as Navigation from '@react-navigation/native'
import { RouteProp } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess, EvidenceMetadata, EvidenceType } from 'react-native-bcsc-core'
import EvidenceTypeListScreen from './EvidenceTypeListScreen'

jest.mock('@/bcsc-theme/hooks/useDataLoader')
jest.mock('@/bcsc-theme/hooks/useSecureActions')

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useStore: jest.fn(),
  useServices: jest.fn(),
}))

const mockUseStore = useStore as jest.Mock
const mockUseDataLoader = useDataLoader as jest.Mock
const mockUseSecureActions = useSecureActions as jest.Mock
const mockUseServices = useServices as jest.Mock

type EvidenceTypeListRoute = RouteProp<BCSCVerifyStackParams, BCSCScreens.EvidenceTypeList>

const defaultLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), trace: jest.fn() }

const makeEvidenceType = (overrides: Partial<EvidenceType> = {}): EvidenceType => ({
  evidence_type: 'BC Drivers Licence',
  has_photo: true,
  group: 'BRITISH COLUMBIA',
  group_sort_order: 1,
  sort_order: 1,
  collection_order: 'BOTH',
  document_reference_input_mask: '',
  document_reference_label: '',
  document_reference_sample: '',
  image_sides: [],
  evidence_type_label: 'BC Drivers Licence',
  ...overrides,
})

const mockMetadata = (evidenceTypes: EvidenceType[], process = BCSCCardProcess.None as string) => ({
  processes: [{ process, evidence_types: evidenceTypes }],
})

describe('EvidenceTypeList', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()

    mockUseStore.mockReturnValue([initialState, jest.fn()])
    mockUseServices.mockReturnValue([defaultLogger])
    mockUseSecureActions.mockReturnValue({
      removeIncompleteEvidence: jest.fn().mockResolvedValue([]),
      truncateEvidence: jest.fn().mockResolvedValue([]),
      addEvidenceType: jest.fn(),
    })
    mockUseDataLoader.mockReturnValue({
      data: undefined,
      load: jest.fn(),
      isLoading: false,
    })
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={{ params: { cardProcess: BCSCCardProcess.None } } as EvidenceTypeListRoute}
        />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders "Other Options" footer when photoFilter is photo and no evidence selected', () => {
    const { getByText, getByTestId } = render(
      <BasicAppContext>
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={
            { params: { cardProcess: BCSCCardProcess.BCSCNonPhoto, photoFilter: 'photo' } } as EvidenceTypeListRoute
          }
        />
      </BasicAppContext>
    )

    expect(getByText('BCSC.EvidenceTypeList.ShowMoreOptions')).toBeTruthy()
    expect(getByTestId('com.ariesbifold:id/EvidenceTypeListOtherOptions')).toBeTruthy()
  })

  it('navigates to nonPhoto filter when "Other Options" is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={
            { params: { cardProcess: BCSCCardProcess.BCSCNonPhoto, photoFilter: 'photo' } } as EvidenceTypeListRoute
          }
        />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId('com.ariesbifold:id/EvidenceTypeListOtherOptions'))
    expect(mockNavigation.replace).toHaveBeenCalledWith('BCSCEvidenceTypeList', {
      cardProcess: BCSCCardProcess.BCSCNonPhoto,
      photoFilter: 'nonPhoto',
    })
  })

  it('does not render "Other Options" footer when photoFilter is nonPhoto', () => {
    const { queryByText } = render(
      <BasicAppContext>
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={
            { params: { cardProcess: BCSCCardProcess.BCSCNonPhoto, photoFilter: 'nonPhoto' } } as EvidenceTypeListRoute
          }
        />
      </BasicAppContext>
    )

    expect(queryByText('BCSC.EvidenceTypeList.ShowMoreOptions')).toBeNull()
  })

  describe('shouldAddEvidence', () => {
    it('should show FIRST and BOTH cards when no evidence has been selected', () => {
      const firstCard = makeEvidenceType({ collection_order: 'FIRST', evidence_type_label: 'First Card' })
      const secondCard = makeEvidenceType({ collection_order: 'SECOND', evidence_type_label: 'Second Card' })
      const bothCard = makeEvidenceType({ collection_order: 'BOTH', evidence_type_label: 'Both Card' })
      const process = BCSCCardProcess.None as string

      mockUseDataLoader.mockReturnValue({
        data: mockMetadata([firstCard, secondCard, bothCard], process),
        load: jest.fn(),
        isLoading: false,
      })

      const { getByText, queryByText } = render(
        <BasicAppContext>
          <EvidenceTypeListScreen
            navigation={mockNavigation as never}
            route={{ params: { cardProcess: BCSCCardProcess.None } } as EvidenceTypeListRoute}
          />
        </BasicAppContext>
      )

      expect(getByText('First Card')).toBeTruthy()
      expect(getByText('Both Card')).toBeTruthy()
      expect(queryByText('Second Card')).toBeNull()
    })

    it('should show SECOND and BOTH cards when evidence has already been selected', () => {
      const firstCard = makeEvidenceType({
        evidence_type: 'First Card',
        collection_order: 'FIRST',
        evidence_type_label: 'First Card',
      })
      const secondCard = makeEvidenceType({
        evidence_type: 'Second Card',
        collection_order: 'SECOND',
        evidence_type_label: 'Second Card',
      })
      const bothCard = makeEvidenceType({
        evidence_type: 'Both Card',
        collection_order: 'BOTH',
        evidence_type_label: 'Both Card',
      })
      const process = BCSCCardProcess.None as string

      const existingEvidence: EvidenceMetadata = {
        evidenceType: makeEvidenceType({ evidence_type: 'Some Other Card', evidence_type_label: 'Some Other Card' }),
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'SO123',
      }

      mockUseStore.mockReturnValue([
        { ...initialState, bcscSecure: { ...initialState.bcscSecure, additionalEvidenceData: [existingEvidence] } },
        jest.fn(),
      ])
      mockUseDataLoader.mockReturnValue({
        data: mockMetadata([firstCard, secondCard, bothCard], process),
        load: jest.fn(),
        isLoading: false,
      })

      const { getByText, queryByText } = render(
        <BasicAppContext>
          <EvidenceTypeListScreen
            navigation={mockNavigation as never}
            route={{ params: { cardProcess: BCSCCardProcess.None } } as EvidenceTypeListRoute}
          />
        </BasicAppContext>
      )

      expect(getByText('Second Card')).toBeTruthy()
      expect(getByText('Both Card')).toBeTruthy()
      expect(queryByText('First Card')).toBeNull()
    })

    it('should exclude evidence types that have already been used (complete or incomplete)', () => {
      const bothCard = makeEvidenceType({
        evidence_type: 'BC Drivers Licence',
        collection_order: 'BOTH',
        evidence_type_label: 'BC Drivers Licence',
      })
      const secondCard = makeEvidenceType({
        evidence_type: 'Passport',
        collection_order: 'SECOND',
        evidence_type_label: 'Passport',
      })
      const process = BCSCCardProcess.None as string

      const existingEvidence: EvidenceMetadata = {
        evidenceType: makeEvidenceType({
          evidence_type: 'BC Drivers Licence',
          evidence_type_label: 'BC Drivers Licence',
        }),
        metadata: [{ uri: 'front.jpg' } as any, { uri: 'back.jpg' } as any],
        documentNumber: 'DL123',
      }

      mockUseStore.mockReturnValue([
        { ...initialState, bcscSecure: { ...initialState.bcscSecure, additionalEvidenceData: [existingEvidence] } },
        jest.fn(),
      ])
      mockUseDataLoader.mockReturnValue({
        data: mockMetadata([bothCard, secondCard], process),
        load: jest.fn(),
        isLoading: false,
      })

      const { getByText, queryByText } = render(
        <BasicAppContext>
          <EvidenceTypeListScreen
            navigation={mockNavigation as never}
            route={{ params: { cardProcess: BCSCCardProcess.None } } as EvidenceTypeListRoute}
          />
        </BasicAppContext>
      )

      expect(getByText('Passport')).toBeTruthy()
      expect(queryByText('BC Drivers Licence')).toBeNull()
    })

    it('should exclude evidence types that have been added but not yet completed', () => {
      const bothCard = makeEvidenceType({
        evidence_type: 'Canadian Passport',
        collection_order: 'BOTH',
        evidence_type_label: 'Canadian Passport',
      })
      const secondCard = makeEvidenceType({
        evidence_type: 'Birth Certificate',
        collection_order: 'SECOND',
        evidence_type_label: 'Birth Certificate',
      })
      const process = BCSCCardProcess.NonBCSC as string

      // Incomplete entry — no metadata photos, no documentNumber.
      const incompleteEvidence: EvidenceMetadata = {
        evidenceType: makeEvidenceType({
          evidence_type: 'Canadian Passport',
          evidence_type_label: 'Canadian Passport',
        }),
        metadata: [],
      }

      mockUseStore.mockReturnValue([
        { ...initialState, bcscSecure: { ...initialState.bcscSecure, additionalEvidenceData: [incompleteEvidence] } },
        jest.fn(),
      ])
      mockUseDataLoader.mockReturnValue({
        data: mockMetadata([bothCard, secondCard], process),
        load: jest.fn(),
        isLoading: false,
      })

      const { queryByText } = render(
        <BasicAppContext>
          <EvidenceTypeListScreen
            navigation={mockNavigation as never}
            route={{ params: { cardProcess: BCSCCardProcess.NonBCSC } } as EvidenceTypeListRoute}
          />
        </BasicAppContext>
      )

      expect(queryByText('Canadian Passport')).toBeNull()
    })
  })

  describe('non-photo BCSC second ID', () => {
    // Once a non-photo ID has been submitted as the first additional ID, the next list must be the
    // SECOND-order photo IDs (which is where groups like "OTHER COUNTRIES" live) — not a repeat of
    // the first-ID list, and without the "Other Options" escape hatch.
    it('shows SECOND-order photo IDs and hides "Other Options"', () => {
      const firstPhotoCard = makeEvidenceType({
        evidence_type: 'BC Drivers Licence',
        evidence_type_label: 'BC Drivers Licence',
        collection_order: 'FIRST',
        has_photo: true,
      })
      const secondPhotoCard = makeEvidenceType({
        evidence_type: 'Foreign Passport',
        evidence_type_label: 'Foreign Passport',
        collection_order: 'SECOND',
        has_photo: true,
        group: 'OTHER COUNTRIES',
      })
      const birthCertificate = makeEvidenceType({
        evidence_type: 'Birth Certificate',
        evidence_type_label: 'Birth Certificate',
        collection_order: 'FIRST',
        has_photo: false,
      })
      const process = BCSCCardProcess.BCSCNonPhoto as string

      const completedBirthCertificate: EvidenceMetadata = {
        evidenceType: birthCertificate,
        metadata: [{ uri: 'front.jpg' } as any],
        documentNumber: 'BC123',
      }

      mockUseStore.mockReturnValue([
        {
          ...initialState,
          bcscSecure: {
            ...initialState.bcscSecure,
            cardProcess: BCSCCardProcess.BCSCNonPhoto,
            additionalEvidenceData: [completedBirthCertificate],
          },
        },
        jest.fn(),
      ])
      mockUseDataLoader.mockReturnValue({
        data: mockMetadata([firstPhotoCard, secondPhotoCard, birthCertificate], process),
        load: jest.fn(),
        isLoading: false,
      })

      const { getByText, queryByText } = render(
        <BasicAppContext>
          <EvidenceTypeListScreen
            navigation={mockNavigation as never}
            route={
              { params: { cardProcess: BCSCCardProcess.BCSCNonPhoto, photoFilter: 'photo' } } as EvidenceTypeListRoute
            }
          />
        </BasicAppContext>
      )

      expect(getByText('OTHER COUNTRIES')).toBeTruthy()
      expect(getByText('Foreign Passport')).toBeTruthy()
      expect(queryByText('BC Drivers Licence')).toBeNull()
      expect(queryByText('Birth Certificate')).toBeNull()
      expect(queryByText('BCSC.EvidenceTypeList.ShowMoreOptions')).toBeNull()
    })
  })

  describe('non-BCSC second ID', () => {
    const nonPhotoFirstId = makeEvidenceType({
      evidence_type: 'Birth Certificate',
      evidence_type_label: 'Birth Certificate',
      collection_order: 'FIRST',
      has_photo: false,
    })
    const photoSecondId = makeEvidenceType({
      evidence_type: 'Foreign Passport',
      evidence_type_label: 'Foreign Passport',
      collection_order: 'SECOND',
      has_photo: true,
    })
    const nonPhotoSecondId = makeEvidenceType({
      evidence_type: 'Marriage Certificate',
      evidence_type_label: 'Marriage Certificate',
      collection_order: 'SECOND',
      has_photo: false,
    })

    const renderWithFirstId = (firstIdType: EvidenceType) => {
      const completedFirstId: EvidenceMetadata = {
        evidenceType: firstIdType,
        metadata: [{ uri: 'front.jpg' } as any],
        documentNumber: 'ID123',
      }

      mockUseStore.mockReturnValue([
        {
          ...initialState,
          bcscSecure: {
            ...initialState.bcscSecure,
            cardProcess: BCSCCardProcess.NonBCSC,
            additionalEvidenceData: [completedFirstId],
          },
        },
        jest.fn(),
      ])
      mockUseDataLoader.mockReturnValue({
        data: mockMetadata([nonPhotoFirstId, photoSecondId, nonPhotoSecondId], BCSCCardProcess.NonBCSC as string),
        load: jest.fn(),
        isLoading: false,
      })

      return render(
        <BasicAppContext>
          <EvidenceTypeListScreen
            navigation={mockNavigation as never}
            route={{ params: { cardProcess: BCSCCardProcess.NonBCSC } } as EvidenceTypeListRoute}
          />
        </BasicAppContext>
      )
    }

    // Two IDs are collected and at least one must carry a photo, so a photo-less first ID forces
    // the second list to photo IDs even though no photoFilter route param is passed.
    it('restricts the list to photo IDs when the first ID has no photo', () => {
      const { getByText, queryByText } = renderWithFirstId(nonPhotoFirstId)

      expect(getByText('Foreign Passport')).toBeTruthy()
      expect(queryByText('Marriage Certificate')).toBeNull()
    })

    it('allows non-photo IDs when the first ID already has a photo', () => {
      const photoFirstId = makeEvidenceType({
        evidence_type: 'BC Drivers Licence',
        evidence_type_label: 'BC Drivers Licence',
        collection_order: 'FIRST',
        has_photo: true,
      })
      const { getByText } = renderWithFirstId(photoFirstId)

      expect(getByText('Foreign Passport')).toBeTruthy()
      expect(getByText('Marriage Certificate')).toBeTruthy()
    })
  })

  describe('useFocusEffect', () => {
    it('should call removeIncompleteEvidence on mount', () => {
      jest.spyOn(Navigation, 'useFocusEffect').mockImplementation((callback) => {
        callback()
      })

      const removeIncompleteEvidenceMock = jest.fn().mockResolvedValue([])
      mockUseSecureActions.mockReturnValue({
        removeIncompleteEvidence: removeIncompleteEvidenceMock,
        truncateEvidence: jest.fn().mockResolvedValue([]),
        addEvidenceType: jest.fn(),
      })

      render(
        <BasicAppContext>
          <EvidenceTypeListScreen
            navigation={mockNavigation as never}
            route={{ params: { cardProcess: BCSCCardProcess.None } } as EvidenceTypeListRoute}
          />
        </BasicAppContext>
      )

      expect(removeIncompleteEvidenceMock).toHaveBeenCalledWith(initialState.bcscSecure.additionalEvidenceData)
    })

    it('should call removeIncompleteEvidence with current evidence data', () => {
      jest.spyOn(Navigation, 'useFocusEffect').mockImplementation((callback) => {
        callback()
      })

      const removeIncompleteEvidenceMock = jest.fn().mockResolvedValue([])
      mockUseSecureActions.mockReturnValue({
        removeIncompleteEvidence: removeIncompleteEvidenceMock,
        truncateEvidence: jest.fn().mockResolvedValue([]),
        addEvidenceType: jest.fn(),
      })

      const existingEvidence: EvidenceMetadata = {
        evidenceType: makeEvidenceType({ evidence_type_label: 'BC Drivers Licence' }),
        metadata: [],
      }

      mockUseStore.mockReturnValue([
        { ...initialState, bcscSecure: { ...initialState.bcscSecure, additionalEvidenceData: [existingEvidence] } },
        jest.fn(),
      ])

      render(
        <BasicAppContext>
          <EvidenceTypeListScreen
            navigation={mockNavigation as never}
            route={{ params: { cardProcess: BCSCCardProcess.None } } as EvidenceTypeListRoute}
          />
        </BasicAppContext>
      )

      expect(removeIncompleteEvidenceMock).toHaveBeenCalledWith([existingEvidence])
    })
  })
})
