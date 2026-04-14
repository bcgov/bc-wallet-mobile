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
      removeIncompleteEvidence: jest.fn(),
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
      const firstCard = makeEvidenceType({ collection_order: 'FIRST', evidence_type_label: 'First Card' })
      const secondCard = makeEvidenceType({ collection_order: 'SECOND', evidence_type_label: 'Second Card' })
      const bothCard = makeEvidenceType({ collection_order: 'BOTH', evidence_type_label: 'Both Card' })
      const process = BCSCCardProcess.None as string

      const existingEvidence: EvidenceMetadata = {
        evidenceType: makeEvidenceType({ evidence_type_label: 'Some Other Card' }),
        metadata: [],
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

    it('should exclude evidence types that have already been fully collected', () => {
      const bothCard = makeEvidenceType({ collection_order: 'BOTH', evidence_type_label: 'BC Drivers Licence' })
      const secondCard = makeEvidenceType({ collection_order: 'SECOND', evidence_type_label: 'Passport' })
      const process = BCSCCardProcess.None as string

      // A complete evidence entry — both photos + a document number. shouldAddEvidence only
      // filters out cards whose existing entry is complete; incomplete entries remain selectable.
      const existingEvidence: EvidenceMetadata = {
        evidenceType: makeEvidenceType({ evidence_type_label: 'BC Drivers Licence' }),
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
  })

  describe('useFocusEffect', () => {
    it('should call removeIncompleteEvidence on mount', () => {
      jest.spyOn(Navigation, 'useFocusEffect').mockImplementation((callback) => {
        callback()
      })

      const removeIncompleteEvidenceMock = jest.fn()
      mockUseSecureActions.mockReturnValue({
        removeIncompleteEvidence: removeIncompleteEvidenceMock,
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

      const removeIncompleteEvidenceMock = jest.fn()
      mockUseSecureActions.mockReturnValue({
        removeIncompleteEvidence: removeIncompleteEvidenceMock,
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
