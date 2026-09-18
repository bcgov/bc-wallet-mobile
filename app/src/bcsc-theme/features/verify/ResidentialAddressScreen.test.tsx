import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getResumeStepRoute } from '@/bcsc-theme/utils/resume-step-route'
import { ADDRESS_MAX_LENGTH } from '@/bcsc-theme/utils/validation'
import { initialBCSCSecureState } from '@/store'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ScrollView, TextInput } from 'react-native'
import { KeyboardEvents } from 'react-native-keyboard-controller'
import { ResidentialAddressScreen } from './ResidentialAddressScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')

jest.mock('@/bcsc-theme/utils/resume-step-route', () => ({
  getResumeStepRoute: jest.fn(),
}))

// Overrides the shared mock so KeyboardEvents.addListener can be spied on.
jest.mock('react-native-keyboard-controller', () => {
  const { ScrollView: RealScrollView } = jest.requireActual('react-native')
  return {
    KeyboardAwareScrollView: RealScrollView,
    KeyboardEvents: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  }
})

const mockUpdateUserMetadata = jest.fn().mockResolvedValue(undefined)
const mockUpdateDeviceCodes = jest.fn().mockResolvedValue(undefined)
const mockUpdateVerificationOptions = jest.fn().mockResolvedValue(undefined)
const mockUpdateCardProcess = jest.fn().mockResolvedValue(undefined)

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateUserMetadata: mockUpdateUserMetadata,
    updateDeviceCodes: mockUpdateDeviceCodes,
    updateVerificationOptions: mockUpdateVerificationOptions,
    updateCardProcess: mockUpdateCardProcess,
  })),
}))

describe('ResidentialAddress', () => {
  let mockNavigation: any
  let mockRoute: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.mocked(getResumeStepRoute).mockReturnValue({ name: BCSCScreens.EvidenceTypeList } as never)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  describe('focus and scroll on invalid submit', () => {
    let scrollToSpy: jest.SpyInstance
    let focusSpy: jest.SpyInstance
    let isFocusedSpy: jest.SpyInstance

    beforeEach(() => {
      scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn())
      focusSpy = jest.spyOn(TextInput.prototype, 'focus')
      // Tests that move focus elsewhere override this.
      isFocusedSpy = jest.spyOn(TextInput.prototype, 'isFocused').mockReturnValue(true)
    })

    afterEach(() => {
      scrollToSpy.mockRestore()
      focusSpy.mockRestore()
      isFocusedSpy.mockRestore()
    })

    const focusedTestIds = () => focusSpy.mock.instances.map((instance: any) => instance.props.testID)

    const layout = (tree: ReturnType<typeof render>, testId: string, y: number) =>
      fireEvent(tree.getByTestId(testId), 'layout', { nativeEvent: { layout: { y } } })

    const enter = (tree: ReturnType<typeof render>, field: string, text: string) =>
      fireEvent(tree.getByTestId(`com.ariesbifold:id/${field}-input`), 'change', { nativeEvent: { text } })

    // Call after filling postalCode: province's onModalClose auto-advance (#4626) would otherwise focus() it.
    const selectProvince = (tree: ReturnType<typeof render>, value: string) => {
      fireEvent.press(tree.getByTestId('com.ariesbifold:id/province-input'))
      fireEvent.press(tree.getByTestId(`com.ariesbifold:id/province-option-${value}`))
    }

    it('still auto-advances to postal code after the province picker closes', async () => {
      const tree = render(
        <BasicAppContext>
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      selectProvince(tree, 'BC')

      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/postalCode-input'])
    })

    it('scrolls to and focuses street address on an empty submit', async () => {
      const tree = render(
        <BasicAppContext>
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      layout(tree, 'com.ariesbifold:id/streetAddress1-input', 20)

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })

      expect(scrollToSpy).toHaveBeenCalledWith({ y: 20, animated: false })
      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/streetAddress1-input'])
      expect(scrollToSpy.mock.invocationCallOrder[0]).toBeLessThan(focusSpy.mock.invocationCallOrder[0])
    })

    it('focuses streetAddress2 when it alone exceeds the max length', async () => {
      const tree = render(
        <BasicAppContext>
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      enter(tree, 'streetAddress1', '123 Main St')
      enter(tree, 'streetAddress2', 'A'.repeat(ADDRESS_MAX_LENGTH + 1))
      enter(tree, 'city', 'Victoria')
      enter(tree, 'postalCode', 'V8V 1A1')
      selectProvince(tree, 'BC')

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })

      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/streetAddress2-input'])
    })

    it('focuses city rather than postal code when both are invalid', async () => {
      const tree = render(
        <BasicAppContext>
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      enter(tree, 'streetAddress1', '123 Main St')
      // city left empty (invalid); postal code invalid too, but city sits earlier in FIELD_ORDER
      enter(tree, 'postalCode', 'D1A 1A1')

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })

      expect(focusedTestIds()).toEqual(['com.ariesbifold:id/city-input'])
    })

    it('scrolls to province but does not focus or listen when it is the only invalid field', async () => {
      const tree = render(
        <BasicAppContext>
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      layout(tree, 'com.ariesbifold:id/province-input', 240)
      enter(tree, 'streetAddress1', '123 Main St')
      enter(tree, 'city', 'Victoria')
      enter(tree, 'postalCode', 'V8V 1A1')

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })

      expect(scrollToSpy).toHaveBeenCalledWith({ y: 240, animated: false })
      expect(focusSpy).not.toHaveBeenCalled()
      expect(KeyboardEvents.addListener).not.toHaveBeenCalled()
    })

    it('re-fires scroll and focus on a repeated identical invalid submit', async () => {
      const tree = render(
        <BasicAppContext>
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      layout(tree, 'com.ariesbifold:id/streetAddress1-input', 20)

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })
      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })

      expect(scrollToSpy).toHaveBeenCalledTimes(2)
      expect(focusSpy).toHaveBeenCalledTimes(2)
    })

    it('does not re-fire when only the field value changes (no resubmit)', async () => {
      const tree = render(
        <BasicAppContext>
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      layout(tree, 'com.ariesbifold:id/streetAddress1-input', 20)

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })
      expect(scrollToSpy).toHaveBeenCalledTimes(1)
      expect(focusSpy).toHaveBeenCalledTimes(1)

      enter(tree, 'city', 'Victoria')

      expect(scrollToSpy).toHaveBeenCalledTimes(1)
      expect(focusSpy).toHaveBeenCalledTimes(1)
    })

    it('does not re-jump a parked keyboardDidShow once focus has moved elsewhere', async () => {
      const tree = render(
        <BasicAppContext>
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      layout(tree, 'com.ariesbifold:id/streetAddress1-input', 20)

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })
      expect(scrollToSpy).toHaveBeenCalledTimes(1)

      const [, onKeyboardDidShow] = jest.mocked(KeyboardEvents.addListener).mock.calls[0]
      const { remove } = jest.mocked(KeyboardEvents.addListener).mock.results[0].value

      isFocusedSpy.mockReturnValue(false)
      act(() => onKeyboardDidShow({} as never))

      expect(scrollToSpy).toHaveBeenCalledTimes(1)
      expect(remove).toHaveBeenCalledTimes(1)
    })

    it('does not scroll or focus on a valid submit', async () => {
      const futureExpiry = new Date(Date.now() + 3600000)
      const tree = render(
        <BasicAppContext
          initialStateOverride={{
            bcscSecure: {
              ...initialBCSCSecureState,
              birthdate: new Date(1990, 0, 15),
              userMetadata: { name: { first: 'Jane', last: 'Doe' } },
              deviceCode: 'existing-device-code',
              deviceCodeExpiresAt: futureExpiry,
            },
          }}
        >
          <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
        </BasicAppContext>
      )

      enter(tree, 'streetAddress1', '123 Main St')
      enter(tree, 'city', 'Victoria')
      enter(tree, 'postalCode', 'V8V 1A1')
      selectProvince(tree, 'BC')

      await act(async () => {
        fireEvent.press(tree.getByTestId('com.ariesbifold:id/ResidentialAddressContinue'))
      })

      expect(scrollToSpy).not.toHaveBeenCalled()
      expect(focusSpy).not.toHaveBeenCalled()
      expect(mockUpdateUserMetadata).toHaveBeenCalled()
    })
  })
})
