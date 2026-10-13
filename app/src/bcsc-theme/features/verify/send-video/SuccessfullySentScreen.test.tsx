import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState, initialState, VerificationStatus } from '@/store'
import { useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import SuccessfullySentScreen from './SuccessfullySentScreen'

/** Exposes the current verified status in the tree so tests can observe useLeaveVerification. */
const VerifiedStatusProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="VerifiedStatusProbe">{store.bcscSecure.verifiedStatus}</Text>
}

const NEXT_BUTTON = 'com.ariesbifold:id/GoToHome'

const inProgress = (verificationSkipped: boolean): Partial<BCState> => ({
  bcsc: { ...initialState.bcsc, verificationSkipped },
  bcscSecure: { ...initialState.bcscSecure, verifiedStatus: VerificationStatus.IN_PROGRESS },
})

describe('SuccessfullySent', () => {
  let mockNavigation: { replace: jest.Mock }

  beforeEach(() => {
    mockNavigation = { replace: jest.fn() }
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderScreen = (state?: Partial<BCState>) =>
    render(
      <BasicAppContext initialStateOverride={state}>
        <SuccessfullySentScreen navigation={mockNavigation as never} route={{ params: {} } as never} />
        <VerifiedStatusProbe />
      </BasicAppContext>
    )

  // Note: the turnaround-sentence composition and the "reviewed by" date both run through i18n
  // interpolation, which the react-i18next test mock returns as the raw key — so those strings are
  // exercised via the flow (useEvidenceUploadModel forwards the API turnaround as a route param) and
  // by typecheck, not asserted here.
  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <SuccessfullySentScreen navigation={mockNavigation as never} route={{ params: {} } as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('sends a deferred verifier home with "Go to home", keeping their progress', () => {
    const tree = renderScreen(inProgress(true))

    expect(tree.getByText('BCSC.SendVideo.SuccessfullySent.ButtonText')).toBeTruthy()
    act(() => {
      fireEvent.press(tree.getByTestId(NEXT_BUTTON))
    })

    expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.UNVERIFIED)
    expect(mockNavigation.replace).not.toHaveBeenCalled()
  })

  it('keeps a first-time verifier in the flow: "Check status" replaces onto the pending review', () => {
    const tree = renderScreen(inProgress(false))

    expect(tree.getByText('BCSC.Steps.CheckStatus')).toBeTruthy()
    act(() => {
      fireEvent.press(tree.getByTestId(NEXT_BUTTON))
    })

    expect(mockNavigation.replace).toHaveBeenCalledWith(BCSCScreens.PendingReview)
    expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.IN_PROGRESS)
  })
})
