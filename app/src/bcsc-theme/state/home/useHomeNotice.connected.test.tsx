import { BCSCAccountProvider } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { seedBCSCStoreFromBCState } from '@/bcsc-theme/storage/testing'
import { VerificationRequestStatus } from '@/constants'
import { initialBCSCSecureState } from '@/store'
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

  return renderHook(() => ({ notice: useHomeNotice() }), { wrapper })
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
    const seed = (bcscSecure: Record<string, unknown>) =>
      act(() => {
        seedBCSCStoreFromBCState({ bcscSecure }, { reset: false })
      })
    const setStatus = (verificationRequestStatus: VerificationRequestStatus) =>
      act(() => {
        getBCSCState().session.update({ verificationRequestStatus })
      })

    expect(result.current.notice.type).toBe(HomeNoticeType.BCSCStartVerification)

    seed({ verificationRequestId: 'request-1' })
    setStatus(VerificationRequestStatus.PENDING)
    expect(result.current.notice.type).toBe(HomeNoticeType.BCSCPendingReview)

    setStatus(VerificationRequestStatus.CANCELLED)
    expect(result.current.notice.type).toBe(HomeNoticeType.BCSCCancelledReview)

    setStatus(VerificationRequestStatus.VERIFIED)
    expect(result.current.notice.type).toBe(HomeNoticeType.BCSCVerified)

    seed({ verified: true })
    await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalled())
    expect(result.current.notice.type).toBe(HomeNoticeType.None)

    await act(async () => {
      resolveMetadata(userData(8))
    })
    await waitFor(() => expect(result.current.notice.type).toBe(HomeNoticeType.AccountRenewalAvailable))
  })
})
