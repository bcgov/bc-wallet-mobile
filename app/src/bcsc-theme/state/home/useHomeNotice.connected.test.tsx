import { BCSCAccountProvider } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { VerificationRequestStatus } from '@/constants'
import { BCDispatchAction, BCState, initialBCSCSecureState } from '@/store'
import { useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import moment from 'moment'
import React from 'react'
import { AppState } from 'react-native'
import { HomeNoticeType } from './home-notice'
import { useHomeNotice } from './useHomeNotice'

// Real provider, hooks and store: only the user API is mocked
jest.unmock('@/bcsc-theme/contexts/BCSCAccountContext')

const mockGetUserMetadata = jest.fn()

jest.mock('@/bcsc-theme/services/hooks/useUserService', () => ({
  useUserService: jest.fn(() => ({
    getUserMetadata: mockGetUserMetadata,
  })),
}))

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: {
    isReady: () => true,
    getCurrentRoute: () => ({ name: 'Home' }),
  },
}))

const userData = (daysUntilExpiry: number) => ({
  user: {
    sub: 'sub-123',
    given_names: 'Steve John',
    family_name: 'Brule',
    card_expiry: moment().add(daysUntilExpiry, 'days').format('MMMM D, YYYY'),
  },
  picture: 'file:///photo.jpg',
})

const renderHome = () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BasicAppContext initialStateOverride={{ bcscSecure: initialBCSCSecureState }}>
      <BCSCAccountProvider>{children}</BCSCAccountProvider>
    </BasicAppContext>
  )

  return renderHook(
    () => {
      const [, dispatch] = useStore<BCState>()
      return { dispatch, notice: useHomeNotice() }
    },
    { wrapper }
  )
}

describe('the Home notice, from the store and account provider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMetadata.mockReset()
    ;(AppState as unknown as { currentState: string }).currentState = 'active'
  })

  it('follows the verification from a fresh install to a verified card', async () => {
    let resolveMetadata: (value: ReturnType<typeof userData>) => void = () => {}
    mockGetUserMetadata.mockReturnValue(
      new Promise((resolve) => {
        resolveMetadata = resolve
      })
    )
    const { result } = renderHome()
    const dispatch = (type: BCDispatchAction, payload: unknown[]) =>
      act(() => {
        result.current.dispatch({ type, payload } as Parameters<typeof result.current.dispatch>[0])
      })

    expect(result.current.notice.type).toBe(HomeNoticeType.BCSCStartVerification)

    dispatch(BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID, ['request-1'])
    dispatch(BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, [VerificationRequestStatus.PENDING])
    expect(result.current.notice.type).toBe(HomeNoticeType.BCSCPendingReview)

    dispatch(BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, [VerificationRequestStatus.CANCELLED])
    expect(result.current.notice.type).toBe(HomeNoticeType.BCSCCancelledReview)

    dispatch(BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS, [VerificationRequestStatus.VERIFIED])
    expect(result.current.notice.type).toBe(HomeNoticeType.BCSCVerified)

    dispatch(BCDispatchAction.UPDATE_SECURE_VERIFIED, [true])
    await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalled())
    expect(result.current.notice.type).toBe(HomeNoticeType.None)

    await act(async () => {
      resolveMetadata(userData(8))
    })
    await waitFor(() => expect(result.current.notice.type).toBe(HomeNoticeType.AccountRenewalAvailable))
  })
})
