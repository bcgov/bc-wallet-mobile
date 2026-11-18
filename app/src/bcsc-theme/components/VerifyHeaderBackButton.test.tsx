import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState, initialState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, useStore } from '@bifold/core'
import { useFocusEffect, useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { BackHandler, Text } from 'react-native'
import { createVerifyHeaderBackButton } from './VerifyHeaderBackButton'

/** Exposes whether the user is in the verify flow so tests can observe useLeaveVerification. */
const InVerifyFlowProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="InVerifyFlowProbe">{String(store.bcscSecure.inVerifyFlow)}</Text>
}

const BACK_ID = testIdWithKey(TestIds.common.back)
// What the stack header hands headerLeft (headerBackTestID → testID)
const headerProps = { canGoBack: true, testID: BACK_ID, accessibilityLabel: 'Back' } as any

const inProgress = (verificationSkipped: boolean): Partial<BCState> => ({
  bcsc: { ...initialState.bcsc, verificationSkipped },
  bcscSecure: { ...initialState.bcscSecure, inVerifyFlow: true },
})
const FIRST_TIMER = inProgress(false)
const DEFERRED = inProgress(true)

describe('createVerifyHeaderBackButton', () => {
  const navigation = useNavigation()
  const focusEffectMock = useFocusEffect as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(navigation.canGoBack).mockReturnValue(false)
    // Run the focus callback as an effect, emulating the screen gaining focus after render
    focusEffectMock.mockImplementation((callback: () => void) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(callback, [callback])
    })
  })

  const renderButton = (BackButton: ReturnType<typeof createVerifyHeaderBackButton>, state: Partial<BCState>) =>
    render(
      <BasicAppContext initialStateOverride={state}>
        <BackButton {...headerProps} />
        <InVerifyFlowProbe />
      </BasicAppContext>
    )

  const lastHardwareBackHandler = (spy: jest.SpyInstance) => spy.mock.calls.at(-1)![1] as () => boolean

  it('pops when there is a screen beneath, whoever the user is', () => {
    jest.mocked(navigation.canGoBack).mockReturnValue(true)
    const tree = renderButton(createVerifyHeaderBackButton(), FIRST_TIMER)

    fireEvent.press(tree.getByTestId(BACK_ID))

    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    expect(navigation.replace).not.toHaveBeenCalled()
    expect(tree.getByTestId('InVerifyFlowProbe').props.children).toBe('true')
  })

  it('returns a first-time verifier at the beginning of the stack to the verify prompt, staying in the flow', () => {
    const tree = renderButton(createVerifyHeaderBackButton(), FIRST_TIMER)

    fireEvent.press(tree.getByTestId(BACK_ID))

    expect(navigation.replace).toHaveBeenCalledWith(BCSCScreens.VerifyPrompt)
    expect(navigation.goBack).not.toHaveBeenCalled()
    expect(tree.getByTestId('InVerifyFlowProbe').props.children).toBe('true')
  })

  it('leaves a deferred verifier at the beginning of the stack for Home, progress kept', () => {
    const tree = renderButton(createVerifyHeaderBackButton(), DEFERRED)

    act(() => {
      fireEvent.press(tree.getByTestId(BACK_ID))
    })

    expect(navigation.replace).not.toHaveBeenCalled()
    expect(tree.getByTestId('InVerifyFlowProbe').props.children).toBe('false')
  })

  it('hands a custom handler the navigation, the leave action and the exit policy', () => {
    const onPress = jest.fn()
    const tree = renderButton(createVerifyHeaderBackButton(onPress), FIRST_TIMER)

    fireEvent.press(tree.getByTestId(BACK_ID))

    expect(onPress).toHaveBeenCalledWith(
      navigation,
      expect.any(Function),
      expect.objectContaining({ isFirstTimeVerifier: true, showBackToHomeMenuRow: false })
    )
    expect(navigation.goBack).not.toHaveBeenCalled()
  })

  it('owns Android hardware back, taking the same path as the arrow', () => {
    const spy = jest.spyOn(BackHandler, 'addEventListener')
    jest.mocked(navigation.canGoBack).mockReturnValue(true)
    renderButton(createVerifyHeaderBackButton(), DEFERRED)

    expect(spy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function))
    act(() => {
      expect(lastHardwareBackHandler(spy)()).toBe(true)
    })

    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  it('removes the hardware back handler on unmount', () => {
    const removeMock = jest.fn()
    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove: removeMock })
    const { unmount } = renderButton(createVerifyHeaderBackButton(), DEFERRED)

    unmount()

    expect(removeMock).toHaveBeenCalled()
  })

  describe('hidden', () => {
    it('renders no arrow but still swallows hardware back without navigating', () => {
      const spy = jest.spyOn(BackHandler, 'addEventListener')
      const tree = renderButton(
        createVerifyHeaderBackButton(() => undefined, { hidden: true }),
        FIRST_TIMER
      )

      expect(tree.queryByTestId(BACK_ID)).toBeNull()
      act(() => {
        expect(lastHardwareBackHandler(spy)()).toBe(true)
      })

      expect(navigation.goBack).not.toHaveBeenCalled()
      expect(navigation.replace).not.toHaveBeenCalled()
      expect(tree.getByTestId('InVerifyFlowProbe').props.children).toBe('true')
    })
  })

  // The pending-review configuration: a submitted request waits on an agent, so every verifier may
  // leave it for Home with their progress kept (#4968)
  describe('pending review', () => {
    const createPendingReviewBackButton = () =>
      createVerifyHeaderBackButton((_navigation, leaveVerification) => leaveVerification())

    it('keeps the arrow for a first-time verifier and leaves for Home', () => {
      const tree = renderButton(createPendingReviewBackButton(), FIRST_TIMER)

      act(() => {
        fireEvent.press(tree.getByTestId(BACK_ID))
      })

      expect(navigation.replace).not.toHaveBeenCalled()
      expect(tree.getByTestId('InVerifyFlowProbe').props.children).toBe('false')
    })

    it('keeps the arrow for a deferred verifier and leaves for Home', () => {
      const tree = renderButton(createPendingReviewBackButton(), DEFERRED)

      act(() => {
        fireEvent.press(tree.getByTestId(BACK_ID))
      })

      expect(tree.getByTestId('InVerifyFlowProbe').props.children).toBe('false')
    })

    it('leaves for Home from Android hardware back too', () => {
      const spy = jest.spyOn(BackHandler, 'addEventListener')
      const tree = renderButton(createPendingReviewBackButton(), FIRST_TIMER)

      act(() => {
        expect(lastHardwareBackHandler(spy)()).toBe(true)
      })

      expect(navigation.goBack).not.toHaveBeenCalled()
      expect(tree.getByTestId('InVerifyFlowProbe').props.children).toBe('false')
    })
  })
})
