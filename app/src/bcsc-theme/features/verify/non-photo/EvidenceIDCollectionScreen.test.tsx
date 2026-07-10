import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { initialBCSCSecureState } from '@/store'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ScrollView, View } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import EvidenceIDCollectionScreen from './EvidenceIDCollectionScreen'

jest.mock('@/bcsc-theme/utils/resume-step-route', () => ({
  getResumeStepRoute: jest.fn(),
}))

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
      image_side_name: 'FRONT_SIDE' as const,
      image_side_label: 'Front of Passport',
      image_side_tip: 'Take a photo of the front of your passport',
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
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    // Default: completing this ID advances to a later step (not the evidence list).
    ;(getResumeStepRoute as jest.Mock).mockReturnValue({ name: BCSCScreens.ResidentialAddress })
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
          bcscSecure: {
            ...initialBCSCSecureState,
            cardProcess: BCSCCardProcess.NonBCSC,
            additionalEvidenceData: [{ evidenceType: mockEvidenceType, metadata: [] }],
          },
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

  it('primary button prompts for the second ID while collecting the first of two (Non-BCSC)', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: {
            ...initialBCSCSecureState,
            cardProcess: BCSCCardProcess.NonBCSC,
            additionalEvidenceData: [{ evidenceType: mockEvidenceType, metadata: [] }],
          },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { cardType: mockEvidenceType } } as never}
        />
      </BasicAppContext>
    )

    // i18n resolves to keys in tests, so assert on the translation keys.
    expect(tree.getByText('BCSC.EvidenceIDCollection.TakeSecondIdPhoto')).toBeTruthy()
    expect(tree.queryByText('Global.Continue')).toBeNull()
  })

  it('primary button says Continue on the second ID (Non-BCSC)', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: {
            ...initialBCSCSecureState,
            cardProcess: BCSCCardProcess.NonBCSC,
            // Two evidence entries → this is the second ID, so no further ID is needed after it.
            additionalEvidenceData: [
              { evidenceType: { ...mockEvidenceType, evidence_type: 'first_id' }, metadata: [] },
              { evidenceType: mockEvidenceType, metadata: [] },
            ],
          },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { cardType: mockEvidenceType } } as never}
        />
      </BasicAppContext>
    )

    expect(tree.getByText('Global.Continue')).toBeTruthy()
    expect(tree.queryByText('BCSC.EvidenceIDCollection.TakeSecondIdPhoto')).toBeNull()
  })

  it('scrolls to first invalid field after validation', async () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn())

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

    const formContainer = tree
      .UNSAFE_getAllByType(View)
      .find((node) => node.props.onLayout && node.props.style?.gap === 18)
    expect(formContainer).toBeTruthy()

    fireEvent(formContainer as never, 'layout', { nativeEvent: { layout: { y: 100 } } })
    fireEvent(tree.getByTestId('com.ariesbifold:id/documentNumber-input'), 'layout', {
      nativeEvent: { layout: { y: 25 } },
    })

    await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 125, animated: true })
    scrollToSpy.mockRestore()
  })

  it('keeps the completed ID beneath the evidence list so back returns to it when another ID is needed', async () => {
    // Dual-ID flow: after completing this ID, the next step is picking another one (the evidence
    // list). The just-completed data-entry screen should sit beneath it so back returns here.
    (getResumeStepRoute as jest.Mock).mockReturnValue({
      name: BCSCScreens.EvidenceTypeList,
      params: { cardProcess: BCSCCardProcess.NonBCSC },
    })

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

    fireEvent(tree.getByTestId('com.ariesbifold:id/documentNumber-input'), 'change', {
      nativeEvent: { text: '123456789' },
    })
    await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

    // Pushes the next step (keeping this ID's form in the history) rather than collapsing the stack.
    const action = mockNavigation.dispatch.mock.calls.at(-1)?.[0]
    expect(action).toEqual(
      expect.objectContaining({
        type: 'PUSH',
        payload: expect.objectContaining({ name: BCSCScreens.EvidenceTypeList }),
      })
    )
  })

  it('keeps the completed ID beneath the next step (e.g. address) so back returns to it', async () => {
    // Default resume route is the address step; the completed ID sits beneath it so back returns here.
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

    fireEvent(tree.getByTestId('com.ariesbifold:id/documentNumber-input'), 'change', {
      nativeEvent: { text: '123456789' },
    })
    await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

    // Pushes the address step, keeping this ID's form in the history so back returns here.
    const action = mockNavigation.dispatch.mock.calls.at(-1)?.[0]
    expect(action).toEqual(
      expect.objectContaining({
        type: 'PUSH',
        payload: expect.objectContaining({ name: BCSCScreens.ResidentialAddress }),
      })
    )
  })
})
