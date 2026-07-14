import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import { Linking } from 'react-native'
import { NotificationSettingsScreen } from './NotificationSettingsScreen'

const NPStatus = { DENIED: 'denied', GRANTED: 'granted', UNKNOWN: 'unknown', BLOCKED: 'blocked' }

const mockStatus = jest.fn()

jest.mock('@/utils/PushNotificationsHelper', () => ({
  NotificationPermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNKNOWN: 'unknown', BLOCKED: 'blocked' },
  status: (...args: unknown[]) => mockStatus(...args),
}))

const tid = (key: string) => testIdWithKey(key)

const renderScreen = (stateOverride: Record<string, unknown> = {}) =>
  render(
    <BasicAppContext initialStateOverride={stateOverride as never}>
      <NotificationSettingsScreen />
    </BasicAppContext>
  )

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStatus.mockResolvedValue(NPStatus.UNKNOWN)
  })

  it('reports "on" and opens device settings when permission is granted and the preference is on', async () => {
    mockStatus.mockResolvedValue(NPStatus.GRANTED)
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never)

    renderScreen({ preferences: { usePushNotifications: true } })

    expect(await screen.findByText('BCSC.Settings.NotificationsStatusOn')).toBeTruthy()

    fireEvent.press(await screen.findByTestId(tid('OpenNotificationSettings')))
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('reports "off" when the OS permission was declined', async () => {
    mockStatus.mockResolvedValue(NPStatus.DENIED)

    renderScreen({ preferences: { usePushNotifications: true } })

    expect(await screen.findByText('BCSC.Settings.NotificationsStatusOff')).toBeTruthy()
    expect(screen.getByTestId(tid('OpenNotificationSettings'))).toBeTruthy()
  })

  it('reports "off" when the OS permission is granted but the app preference is off', async () => {
    mockStatus.mockResolvedValue(NPStatus.GRANTED)

    renderScreen({ preferences: { usePushNotifications: false } })

    expect(await screen.findByText('BCSC.Settings.NotificationsStatusOff')).toBeTruthy()
  })
})
