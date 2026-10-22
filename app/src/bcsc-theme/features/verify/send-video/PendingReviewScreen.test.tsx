import { useVerificationPendingActions } from '@/bcsc-theme/hooks/useVerificationPendingActions'
import { VerificationRequestStatus } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useFocusEffect } from '@mocks/@react-navigation/native'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import moment from 'moment'
import React, { useEffect } from 'react'
import { AppState, BackHandler, Pressable } from 'react-native'
import PendingReviewScreen from './PendingReviewScreen'

jest.mock('@/bcsc-theme/hooks/useVerificationPendingActions', () => ({
  __esModule: true,
  useVerificationPendingActions: jest.fn(),
  default: jest.fn(),
}))

const CHECK_STATUS = 'com.ariesbifold:id/CheckStatus'

/** Writes a review status the way useVerificationResponseListener does when the review push lands. */
const ReviewPush = ({ status }: { status: VerificationRequestStatus }) => {
  const [, dispatch] = useStore<BCState>()
  return (
    <Pressable
      testID="ReviewPush"
      accessibilityRole="button"
      accessibilityLabel="Review push"
      onPress={() => dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, payload: [status] })}
    />
  )
}

describe('PendingReview', () => {
  let mockNavigation: any
  const focusEffectMock = useFocusEffect as jest.Mock
  const handleCheckStatus = jest.fn()
  const handleCancelVerification = jest.fn()

  const mockActions = (isCheckingStatus = false) =>
    jest.mocked(useVerificationPendingActions).mockReturnValue({
      handleCheckStatus,
      handleCancelVerification,
      isCheckingStatus,
    } as any)

  beforeEach(() => {
    mockNavigation = { ...useNavigation(), isFocused: jest.fn(() => true) }
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockActions()
    // Run the focus callback as an effect, emulating the screen gaining focus after render
    focusEffectMock.mockImplementation((callback: () => void) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(callback, [callback])
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderScreen = (children?: React.ReactNode, initialStateOverride?: Partial<BCState>) =>
    render(
      <BasicAppContext initialStateOverride={initialStateOverride}>
        <PendingReviewScreen navigation={mockNavigation as never} />
        {children}
      </BasicAppContext>
    )

  it('renders correctly', () => {
    const tree = renderScreen()

    expect(tree).toMatchSnapshot()
  })

  it('renders the submission timestamp when verificationVideoSubmittedAt is set', () => {
    const submittedAt = new Date('2026-03-10T14:30:00')
    const tree = renderScreen(undefined, { bcscSecure: { verificationVideoSubmittedAt: submittedAt } as any })

    expect(tree.getByText(moment(submittedAt).format('dddd MMMM D, YYYY, h:mm a'))).toBeTruthy()
  })

  it('checks the request status once it is focused', () => {
    renderScreen()

    expect(handleCheckStatus).toHaveBeenCalledTimes(1)
    expect(handleCheckStatus).toHaveBeenCalledWith()
  })

  it('offers Check status, and that press surfaces a failure to the user', () => {
    const tree = renderScreen()
    handleCheckStatus.mockClear()

    fireEvent.press(tree.getByTestId(CHECK_STATUS))

    expect(handleCheckStatus).toHaveBeenCalledTimes(1)
    expect(handleCheckStatus).toHaveBeenCalledWith({ surfaceErrors: true })
  })

  it('disables Check status while a check is running', () => {
    mockActions(true)
    const tree = renderScreen()
    handleCheckStatus.mockClear()

    fireEvent.press(tree.getByTestId(CHECK_STATUS))

    expect(handleCheckStatus).not.toHaveBeenCalled()
  })

  it('re-checks when the app returns to the foreground while it is focused', () => {
    const spy = jest.spyOn(AppState, 'addEventListener')
    renderScreen()
    handleCheckStatus.mockClear()
    const onAppStateChange = spy.mock.calls.at(-1)![1] as (state: string) => void

    act(() => onAppStateChange('background'))
    expect(handleCheckStatus).not.toHaveBeenCalled()

    act(() => onAppStateChange('active'))
    expect(handleCheckStatus).toHaveBeenCalledTimes(1)
  })

  it('stops listening to the app state when it loses focus', () => {
    const removeMock = jest.fn()
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: removeMock } as any)
    const { unmount } = renderScreen()

    unmount()

    expect(removeMock).toHaveBeenCalled()
  })

  it('acts on the review push as soon as a decision lands in the store', () => {
    const tree = renderScreen(<ReviewPush status={VerificationRequestStatus.VERIFIED} />)
    handleCheckStatus.mockClear()

    act(() => {
      fireEvent.press(tree.getByTestId('ReviewPush'))
    })

    expect(handleCheckStatus).toHaveBeenCalledTimes(1)
  })

  it('ignores a push that only confirms the request is still pending', () => {
    const tree = renderScreen(<ReviewPush status={VerificationRequestStatus.PENDING} />)
    handleCheckStatus.mockClear()

    act(() => {
      fireEvent.press(tree.getByTestId('ReviewPush'))
    })

    expect(handleCheckStatus).not.toHaveBeenCalled()
  })

  it('cancels the request from Choose another way to verify', () => {
    const tree = renderScreen()

    fireEvent.press(tree.getByTestId('com.ariesbifold:id/ChooseAnotherWayToVerify'))

    expect(handleCancelVerification).toHaveBeenCalledTimes(1)
  })

  it('leaves Android hardware back to the header back button', () => {
    const spy = jest.spyOn(BackHandler, 'addEventListener')

    renderScreen()

    // The verify stack's header owns hardware back (per exit policy); a second handler here would race it
    expect(spy).not.toHaveBeenCalled()
  })
})
