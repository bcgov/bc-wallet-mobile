import { useCardStatus } from '@/bcsc-theme/hooks/useCardStatus'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCSCEventTypes } from '@/events/eventTypes'
import { CustomNotificationId, useCustomNotifications } from '@/hooks/useCustomNotifications'
import { BCDispatchAction, BCState, initialBCSCSecureState, VerificationStatus } from '@/store'
import { useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import moment from 'moment'
import React from 'react'
import { AppState, DeviceEventEmitter } from 'react-native'

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

jest.mock('@/bcsc-theme/features/notifications/VerifiedNotification', () => 'VerifiedNotification')
jest.mock('@/bcsc-theme/features/notifications/CancelledReviewNotification', () => 'CancelledReviewNotification')
jest.mock('@/bcsc-theme/features/notifications/PendingReviewNotification', () => 'PendingReviewNotification')
jest.mock('@/bcsc-theme/features/notifications/StartVerificationNotification', () => 'StartVerificationNotification')
jest.mock(
  '@/bcsc-theme/features/notifications/ContinueVerificationNotification',
  () => 'ContinueVerificationNotification'
)
jest.mock('@/bcsc-theme/features/notifications/CardExpiryNotification', () => 'CardExpiryNotification')
jest.mock('@/bcsc-theme/features/notifications/CardRenewalNotification', () => 'CardRenewalNotification')

import { BCSCAccountProvider } from '@/bcsc-theme/contexts/BCSCAccountContext'

const userData = (daysUntilExpiry: number) => ({
  user: {
    sub: 'sub-123',
    given_names: 'Steve John',
    family_name: 'Brule',
    card_expiry: moment().add(daysUntilExpiry, 'days').format('MMMM D, YYYY'),
  },
  picture: 'file:///photo.jpg',
})

const verified = {
  ...initialBCSCSecureState,
  verified: true,
  verifiedStatus: VerificationStatus.VERIFIED,
  refreshToken: 'stored-refresh',
}

const renderHome = () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BasicAppContext initialStateOverride={{ bcscSecure: verified }}>
      <BCSCAccountProvider>{children}</BCSCAccountProvider>
    </BasicAppContext>
  )

  return renderHook(
    () => {
      const [, dispatch] = useStore<BCState>()
      return { dispatch, cardStatus: useCardStatus(), notifications: useCustomNotifications().customNotifications }
    },
    { wrapper }
  )
}

const notificationKeys = (notifications: React.ReactElement[]) => notifications.map((notification) => notification.key)

const reloadAccount = () => {
  act(() => {
    DeviceEventEmitter.emit(BCSCEventTypes.TOKENS_REFRESHED)
  })
}

describe('card expiry notices, from the account provider to Home', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserMetadata.mockReset()
    ;(AppState as unknown as { currentState: string }).currentState = 'active'
  })

  it('removes the renewal notice when the reloaded account has a renewed expiry date', async () => {
    mockGetUserMetadata.mockResolvedValueOnce(userData(8))
    const { result } = renderHome()

    await waitFor(() => expect(notificationKeys(result.current.notifications)).toEqual(['AccountRenewalAvailable']))
    expect(result.current.notifications[0].props.expiresAt).toBeInstanceOf(Date)
    expect(result.current.cardStatus.isActivelyVerified).toBe(true)

    mockGetUserMetadata.mockResolvedValueOnce(userData(365))
    reloadAccount()

    await waitFor(() => expect(result.current.notifications).toHaveLength(0))
    expect(result.current.cardStatus.isExpired).toBe(false)
    expect(result.current.cardStatus.isActivelyVerified).toBe(true)
  })

  it('keeps the last loaded account, and its notice, when a reload fails', async () => {
    mockGetUserMetadata.mockResolvedValueOnce(userData(8))
    const { result } = renderHome()
    await waitFor(() => expect(notificationKeys(result.current.notifications)).toEqual(['AccountRenewalAvailable']))

    mockGetUserMetadata.mockRejectedValueOnce(new Error('offline'))
    reloadAccount()
    await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalledTimes(2))
    // let the loader's rejection and its error state update land before asserting
    await act(async () => {})

    expect(notificationKeys(result.current.notifications)).toEqual(['AccountRenewalAvailable'])
  })

  it('shows no expiry notice when the account never loads', async () => {
    mockGetUserMetadata.mockRejectedValue(new Error('offline'))
    const { result } = renderHome()

    await waitFor(() => expect(mockGetUserMetadata).toHaveBeenCalled())

    expect(result.current.notifications).toHaveLength(0)
    expect(result.current.cardStatus.isExpired).toBe(false)
    expect(result.current.cardStatus.isActivelyVerified).toBe(true)
  })

  it('shows the expired notice and locks features when the server expires the card mid-session', async () => {
    mockGetUserMetadata.mockResolvedValue(userData(365))
    const { result } = renderHome()
    await waitFor(() => expect(result.current.cardStatus.isActivelyVerified).toBe(true))
    expect(result.current.notifications).toHaveLength(0)

    act(() => {
      result.current.dispatch({
        type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA,
        payload: [{ bcscReason: BCSCReason.ExpiredBySystem }],
      })
    })

    expect(result.current.cardStatus.isExpired).toBe(true)
    expect(notificationKeys(result.current.notifications)).toEqual([CustomNotificationId.AccountExpired])
  })
})
