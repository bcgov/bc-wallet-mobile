import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { initialBCSCSecureState } from '@/store'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ScrollView, TextInput, View } from 'react-native'
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
    jest.mocked(getResumeStepRoute).mockReturnValue({ name: BCSCScreens.ResidentialAddress })
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

  describe('focus and scroll on invalid submit', () => {
    let scrollToSpy: jest.SpyInstance
    let focusSpy: jest.SpyInstance

    beforeEach(() => {
      scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn())
      focusSpy = jest.spyOn(TextInput.prototype, 'focus')
    })

    afterEach(() => {
      scrollToSpy.mockRestore()
      focusSpy.mockRestore()
    })

    const focusedTestIds = () => focusSpy.mock.instances.map((instance: any) => instance.props.testID)

    const enter = (tree: ReturnType<typeof render>, field: string, text: string) =>
      fireEvent(tree.getByTestId(`com.ariesbifold:id/${field}-input`), 'change', { nativeEvent: { text } })

    it('scrolls to and focuses the first invalid field after validation', async () => {
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

      expect(scrollToSpy).toHaveBeenCalledWith({ y: 125, animated: false })
      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/documentNumber-input'])
    })

    it('scrolls to and focuses an empty document number in the full NonBCSC form (zero offset honoured)', async () => {
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

      const formContainer = tree
        .UNSAFE_getAllByType(View)
        .find((node) => node.props.onLayout && node.props.style?.gap === 18)
      fireEvent(formContainer as never, 'layout', { nativeEvent: { layout: { y: 100 } } })
      fireEvent(tree.getByTestId('com.ariesbifold:id/documentNumber-input'), 'layout', {
        nativeEvent: { layout: { y: 0 } },
      })

      enter(tree, 'lastName', 'Smith')
      enter(tree, 'firstName', 'Jane')
      fireEvent.changeText(tree.getByTestId('com.ariesbifold:id/birthDate-input'), '19900101')

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

      expect(scrollToSpy).toHaveBeenCalledWith({ y: 100, animated: false })
      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/documentNumber-input'])
    })

    it('scrolls to and focuses last name when the document number is valid but last name is empty and birth date is invalid', async () => {
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

      enter(tree, 'documentNumber', '123456789')
      fireEvent.changeText(tree.getByTestId('com.ariesbifold:id/birthDate-input'), '99999999')

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/lastName-input'])
    })

    it('targets the field lowest in visual order (middleNames) even though the model inserts birthDate first', async () => {
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

      enter(tree, 'documentNumber', '123456789')
      enter(tree, 'lastName', 'Smith')
      enter(tree, 'firstName', 'Jane')
      enter(tree, 'middleNames', 'A'.repeat(31))
      fireEvent.changeText(tree.getByTestId('com.ariesbifold:id/birthDate-input'), '99999999')

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/middleNames-input'])
    })

    it('re-fires scroll and focus on a repeated, unchanged invalid submit', async () => {
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
      fireEvent(formContainer as never, 'layout', { nativeEvent: { layout: { y: 100 } } })
      fireEvent(tree.getByTestId('com.ariesbifold:id/documentNumber-input'), 'layout', {
        nativeEvent: { layout: { y: 25 } },
      })

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))
      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

      expect(scrollToSpy).toHaveBeenCalledTimes(2)
      expect(focusSpy).toHaveBeenCalledTimes(2)
    })

    it('moves the focus target once the first error is corrected and the form is resubmitted', async () => {
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

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))
      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/documentNumber-input'])

      enter(tree, 'documentNumber', '123456789')

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))
      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/documentNumber-input', 'com.ariesbifold:id/lastName-input'])
    })

    it('still focuses the invalid field when its container was never measured (no scrollTo)', async () => {
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

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

      expect(scrollToSpy).not.toHaveBeenCalled()
      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/documentNumber-input'])
    })

    it('does not scroll or focus on a valid submit', async () => {
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

      enter(tree, 'documentNumber', '123456789')
      enter(tree, 'lastName', 'Smith')
      enter(tree, 'firstName', 'Jane')
      fireEvent.changeText(tree.getByTestId('com.ariesbifold:id/birthDate-input'), '19900101')

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

      expect(scrollToSpy).not.toHaveBeenCalled()
      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('only targets documentNumber on the abbreviated BCSCNonPhoto form', async () => {
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

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/documentNumber-input'])
    })

    it('only targets documentNumber on the second NonBCSC ID (personal info not rendered)', async () => {
      const tree = render(
        <BasicAppContext
          initialStateOverride={{
            bcscSecure: {
              ...initialBCSCSecureState,
              cardProcess: BCSCCardProcess.NonBCSC,
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

      await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/documentNumber-input'])
    })
  })

  it('keeps the completed ID beneath the evidence list so back returns to it when another ID is needed', async () => {
    // Dual-ID flow: after completing this ID, the next step is picking another one (the evidence
    // list). The just-completed data-entry screen should sit beneath it so back returns here.
    jest.mocked(getResumeStepRoute).mockReturnValue({
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

  it('persists names and the document number upper-cased, as IAS stores them', async () => {
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

    const enter = (field: string, text: string) =>
      fireEvent(tree.getByTestId(`com.ariesbifold:id/${field}-input`), 'change', { nativeEvent: { text } })

    enter('documentNumber', '123456789')
    enter('firstName', 'Jane')
    enter('middleNames', 'Alex')
    enter('lastName', "o'brien-smith")
    // DateInput formats digits itself, so it listens on onChangeText rather than onChange
    fireEvent.changeText(tree.getByTestId('com.ariesbifold:id/birthDate-input'), '19900101')

    await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

    expect(mockUpdateUserMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ name: { first: 'JANE', middle: 'ALEX', last: "O'BRIEN-SMITH" } })
    )
    expect(mockUpdateEvidenceDocumentNumber).toHaveBeenCalledWith(mockEvidenceType, '123456789')
  })

  it('applies the document mask to the normalized number, not the raw input', async () => {
    // An upper-case-only mask must not reject what will be submitted upper-cased anyway.
    const upperCaseMaskType = { ...mockEvidenceType, document_reference_input_mask: '^[A-Z]{2}[0-9]{6}$' }
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: { ...initialBCSCSecureState, cardProcess: BCSCCardProcess.BCSCNonPhoto },
        }}
      >
        <EvidenceIDCollectionScreen
          navigation={mockNavigation as never}
          route={{ params: { cardType: upperCaseMaskType } } as never}
        />
      </BasicAppContext>
    )

    fireEvent(tree.getByTestId('com.ariesbifold:id/documentNumber-input'), 'change', {
      nativeEvent: { text: ' ab123456 ' },
    })
    await fireEvent.press(tree.getByTestId('com.ariesbifold:id/EvidenceIDCollectionContinue'))

    expect(tree.queryByText('Please enter a valid document number')).toBeNull()
    expect(mockUpdateEvidenceDocumentNumber).toHaveBeenCalledWith(upperCaseMaskType, 'AB123456')
  })
})
