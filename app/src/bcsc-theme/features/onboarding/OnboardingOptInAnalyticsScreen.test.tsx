import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { PersistentStorage } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'
import { OnboardingOptInAnalyticsScreen } from './OnboardingOptInAnalyticsScreen'

jest.mock('../../../utils/PushNotificationsHelper', () => ({
  status: jest.fn(),
  NotificationPermissionStatus: {
    DENIED: 'denied',
    GRANTED: 'granted',
    UNKNOWN: 'unknown',
    BLOCKED: 'blocked',
  },
}))

describe('OnboardingOptInAnalytics', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(PersistentStorage, 'storeValueForKey').mockResolvedValue()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <OnboardingOptInAnalyticsScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

  it('renders correctly', () => {
    expect(renderScreen()).toMatchSnapshot()
  })

  it('continues to the notifications screen when notification permission is not granted', async () => {
    jest
      .mocked(PushNotifications.status)
      .mockResolvedValue(PushNotifications.NotificationPermissionStatus.DENIED as never)

    const tree = renderScreen()
    fireEvent.press(tree.getByTestId('com.ariesbifold:id/Decline'))

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingNotifications)
    })
  })

  it('skips straight to the secure-app screen when notification permission is already granted', async () => {
    jest
      .mocked(PushNotifications.status)
      .mockResolvedValue(PushNotifications.NotificationPermissionStatus.GRANTED as never)

    const tree = renderScreen()
    fireEvent.press(tree.getByTestId('com.ariesbifold:id/Decline'))

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingSecureApp)
    })
  })
})
