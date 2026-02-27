import { initialBCSCSecureState } from '@/store'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import EvidenceIDCollectionScreen from './EvidenceIDCollectionScreen'

const mockRemoveEvidenceByType = jest.fn().mockResolvedValue(undefined)
const mockUpdateEvidenceDocumentNumber = jest.fn().mockResolvedValue(undefined)
const mockUpdateUserInfo = jest.fn().mockResolvedValue(undefined)
const mockUpdateUserMetadata = jest.fn().mockResolvedValue(undefined)

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    removeEvidenceByType: mockRemoveEvidenceByType,
    updateEvidenceDocumentNumber: mockUpdateEvidenceDocumentNumber,
    updateUserInfo: mockUpdateUserInfo,
    updateUserMetadata: mockUpdateUserMetadata,
  })),
}))

const mockEvidenceType = {
  evidence_type: 'passport',
  has_photo: true,
  group: 'OTHER COUNTRIES' as const,
  group_sort_order: 1,
  sort_order: 1,
  collection_order: 'FIRST' as const,
  document_reference_input_mask: '[0-9]{9}',
  document_reference_label: 'Passport Number',
  document_reference_sample: '123456789',
  image_sides: [
    {
      side: 'FRONT',
      label: 'Front of Passport',
    },
  ],
  evidence_type_label: 'Passport',
}

describe('EvidenceIDCollection', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { cardType: mockEvidenceType } } as never}
        />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('shows abbreviated form (document number only) for BCSCNonPhoto flow', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.BCSCNonPhoto },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { cardType: mockEvidenceType } } as never}
        />
      </BasicAppContext>
    )

    expect(tree.getByTestId('com.ariesbifold:id/documentNumber-input')).toBeTruthy()
    expect(tree.queryByTestId('com.ariesbifold:id/firstName-input')).toBeNull()
    expect(tree.queryByTestId('com.ariesbifold:id/lastName-input')).toBeNull()
    expect(tree.queryByTestId('com.ariesbifold:id/middleNames-input')).toBeNull()
    expect(tree.queryByTestId('com.ariesbifold:id/birthDate-input')).toBeNull()
  })

  it('shows full form (personal info fields) for NonBCSC flow', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.NonBCSC },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { cardType: mockEvidenceType } } as never}
        />
      </BasicAppContext>
    )

    expect(tree.getByTestId('com.ariesbifold:id/documentNumber-input')).toBeTruthy()
    expect(tree.getByTestId('com.ariesbifold:id/firstName-input')).toBeTruthy()
    expect(tree.getByTestId('com.ariesbifold:id/lastName-input')).toBeTruthy()
    expect(tree.getByTestId('com.ariesbifold:id/middleNames-input')).toBeTruthy()
    expect(tree.getByTestId('com.ariesbifold:id/birthDate-input')).toBeTruthy()
  })

  it('cancel removes evidence and navigates to evidence type list', async () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.BCSCNonPhoto },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { cardType: mockEvidenceType } } as never}
        />
      </BasicAppContext>
    )

    const cancelButton = tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionCancel')
    await fireEvent.press(cancelButton)

    expect(mockRemoveEvidenceByType).toHaveBeenCalledWith(mockEvidenceType)
    expect(mockNavigation.dispatch).toHaveBeenCalled()
  })
})
