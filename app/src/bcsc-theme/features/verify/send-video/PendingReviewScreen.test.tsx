import { BCState, VerificationStatus } from '@/store'
import { useStore } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { useFocusEffect } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render } from '@testing-library/react-native'
import moment from 'moment'
import React, { useEffect } from 'react'
import { BackHandler, Text } from 'react-native'
import PendingReviewScreen from './PendingReviewScreen'

/** Exposes the current verified status in the tree so tests can observe store updates. */
const VerifiedStatusProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="VerifiedStatusProbe">{store.bcscSecure.verifiedStatus}</Text>
}

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    evidence: {
      getVerificationRequestStatus: jest.fn(),
      cancelVerificationRequest: jest.fn(),
    },
    token: {
      checkDeviceCodeStatus: jest.fn(),
    },
  })),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  useSecureActions: jest.fn(() => ({})),
  default: jest.fn(() => ({
    updateVerificationRequest: jest.fn(),
    updateAccountFlags: jest.fn().mockResolvedValue(undefined),
  })),
}))

describe('PendingReview', () => {
  let mockNavigation: any
  const focusEffectMock = useFocusEffect as jest.Mock

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Run the focus callback as an effect, emulating the screen gaining focus after render
    focusEffectMock.mockImplementation((callback: () => void) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(callback, [callback])
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <PendingReviewScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders the submission timestamp when verificationVideoSubmittedAt is set', () => {
    const submittedAt = new Date('2026-03-10T14:30:00')
    const tree = render(
      <BasicAppContext initialStateOverride={{ bcscSecure: { verificationVideoSubmittedAt: submittedAt } as any }}>
        <PendingReviewScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree.getByText(moment(submittedAt).format('dddd MMMM D, YYYY, h:mm a'))).toBeTruthy()
  })

  describe('hardware back handling', () => {
    it('sets the verification status to unverified when hardware back is pressed', () => {
      const spy = jest.spyOn(BackHandler, 'addEventListener')
      const tree = render(
        <BasicAppContext>
          <PendingReviewScreen navigation={mockNavigation as never} />
          <VerifiedStatusProbe />
        </BasicAppContext>
      )

      expect(spy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function))
      const handler = spy.mock.calls.at(-1)![1] as () => boolean

      act(() => {
        expect(handler()).toBe(true)
      })

      expect(tree.getByTestId('VerifiedStatusProbe').props.children).toBe(VerificationStatus.UNVERIFIED)
    })

    it('removes the hardware back handler on unmount', () => {
      const removeMock = jest.fn()
      jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove: removeMock })
      const { unmount } = render(
        <BasicAppContext>
          <PendingReviewScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      unmount()

      expect(removeMock).toHaveBeenCalled()
    })
  })
})
