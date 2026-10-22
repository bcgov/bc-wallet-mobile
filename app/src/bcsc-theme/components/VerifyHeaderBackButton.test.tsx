import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState, initialState, VerificationStatus } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, useStore } from '@bifold/core'
import { useFocusEffect, useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { BackHandler, Text } from 'react-native'
import { createVerifyHeaderBackButton } from './VerifyHeaderBackButton'

/** Exposes the current verified status in the tree so tests can observe useLeaveVerification. */
const VerifiedStatusProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="VerifiedStatusProbe">{store.bcscSecure.verifiedStatus}</Text>
}

const BACK_ID = testIdWithKey(TestIds.common.back)
// What the stack header hands headerLeft (headerBackTestID → testID)
const headerProps = { canGoBack: true, testID: BACK_ID, accessibilityLabel: 'Back' } as any

const inProgress = (verificationSkipped: boolean): Partial<BCState> => ({
  bcsc: { ...initialState.bcsc, verificationSkipped },
  bcscSecure: { ...initialState.bcscSecure, verifiedStatus: VerificationStatus.IN_PROGRESS },
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
        <VerifiedStatusProbe />
      </BasicAppContext>
    )

  const lastHardwareBackHandler = (spy: jest.SpyInstance) => spy.mock.calls.at(-1)![1] as () => boolean

  it('pops when there is a screen beneath, whoever the user is', () => {
    jest.mocked(navigation.canGoBack).mockReturnValue(true)
    const tree = renderButton(createVerifyHeaderBackButton(), FIRST_TIMER)

    fireEvent.press(tree.getByTestId(BACK_ID))

    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    expect(navigation.replace).not.toHaveBeenCalled()
    expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.IN_PROGRESS)
  })

  it('returns a first-time verifier at the beginning of the stack to the verify prompt, staying in the flow', () => {
    const tree = renderButton(createVerifyHeaderBackButton(), FIRST_TIMER)

    fireEvent.press(tree.getByTestId(BACK_ID))

    expect(navigation.replace).toHaveBeenCalledWith(BCSCScreens.VerifyPrompt)
    expect(navigation.goBack).not.toHaveBeenCalled()
    expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.IN_PROGRESS)
  })

  it('leaves a deferred verifier at the beginning of the stack for Home, progress kept', () => {
    const tree = renderButton(createVerifyHeaderBackButton(), DEFERRED)

    act(() => {
      fireEvent.press(tree.getByTestId(BACK_ID))
    })

    expect(navigation.replace).not.toHaveBeenCalled()
    expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.UNVERIFIED)
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
      expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.IN_PROGRESS)
    })

    // The pending-review configuration: deferred verifiers leave, first-time verifiers have no way out
    const createPendingReviewBackButton = () =>
      createVerifyHeaderBackButton(
        (_navigation, leaveVerification, { isFirstTimeVerifier }) => {
          if (!isFirstTimeVerifier) {
            leaveVerification()
          }
        },
        { hidden: ({ isFirstTimeVerifier }) => isFirstTimeVerifier }
      )

    it('decides per exit policy: a first-time verifier gets no arrow and hardware back does nothing', () => {
      const spy = jest.spyOn(BackHandler, 'addEventListener')
      const tree = renderButton(createPendingReviewBackButton(), FIRST_TIMER)

      expect(tree.queryByTestId(BACK_ID)).toBeNull()
      act(() => {
        expect(lastHardwareBackHandler(spy)()).toBe(true)
      })

      expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.IN_PROGRESS)
    })

    it('decides per exit policy: a deferred verifier keeps the arrow and leaves for Home', () => {
      const tree = renderButton(createPendingReviewBackButton(), DEFERRED)

      act(() => {
        fireEvent.press(tree.getByTestId(BACK_ID))
      })

      expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.UNVERIFIED)
    })
  })
})
