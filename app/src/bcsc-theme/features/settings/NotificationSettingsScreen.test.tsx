import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Linking } from 'react-native'
import { NotificationSettingsScreen } from './NotificationSettingsScreen'

const NPStatus = { DENIED: 'denied', GRANTED: 'granted', UNKNOWN: 'unknown', BLOCKED: 'blocked' }

const mockStatus = jest.fn()
const mockSetup = jest.fn()
const mockActivate = jest.fn()
const mockHasPrompted = jest.fn()

jest.mock('@/utils/PushNotificationsHelper', () => ({
  NotificationPermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNKNOWN: 'unknown', BLOCKED: 'blocked' },
  status: (...args: unknown[]) => mockStatus(...args),
  setup: (...args: unknown[]) => mockSetup(...args),
  activate: (...args: unknown[]) => mockActivate(...args),
  hasPromptedForNotifications: (...args: unknown[]) => mockHasPrompted(...args),
}))

jest.mock('@/bcsc-theme/features/agent/BCSCAgentProvider', () => ({
  useBCSCAgentSafe: () => ({ agent: { id: 'agent' } }),
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
    mockSetup.mockResolvedValue(NPStatus.GRANTED)
    mockActivate.mockResolvedValue(undefined)
    mockHasPrompted.mockResolvedValue(false)
  })

  it('reports "on" and opens device settings when permission is granted and the preference is on', async () => {
    mockStatus.mockResolvedValue(NPStatus.GRANTED)
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never)

    renderScreen({ preferences: { usePushNotifications: true } })

    expect(await screen.findByText('BCSC.Settings.NotificationsStatusOn')).toBeTruthy()

    fireEvent.press(await screen.findByTestId(tid('OpenNotificationSettings')))
    expect(spy).toHaveBeenCalled()
    // The in-app enable flow is not offered in the ON/OFF states.
    expect(screen.queryByTestId(tid('EnableNotifications'))).toBeNull()
    spy.mockRestore()
  })

  it('reports "off" with the device-settings redirect when permission was previously declined', async () => {
    mockStatus.mockResolvedValue(NPStatus.DENIED)
    mockHasPrompted.mockResolvedValue(true)

    renderScreen({ preferences: { usePushNotifications: true } })

    expect(await screen.findByText('BCSC.Settings.NotificationsStatusOff')).toBeTruthy()
    expect(screen.getByTestId(tid('OpenNotificationSettings'))).toBeTruthy()
    expect(screen.queryByTestId(tid('EnableNotifications'))).toBeNull()
  })

  it('offers the in-app enable flow when the user was never prompted (skipped onboarding)', async () => {
    mockStatus.mockResolvedValue(NPStatus.UNKNOWN)
    mockHasPrompted.mockResolvedValue(false)

    renderScreen()

    fireEvent.press(await screen.findByTestId(tid('EnableNotifications')))

    await waitFor(() => expect(mockSetup).toHaveBeenCalled())
    await waitFor(() => expect(mockActivate).toHaveBeenCalled())
  })

  it('offers the enable flow when permission is granted but the preference is off', async () => {
    mockStatus.mockResolvedValue(NPStatus.GRANTED)

    renderScreen({ preferences: { usePushNotifications: false } })

    fireEvent.press(await screen.findByTestId(tid('EnableNotifications')))

    await waitFor(() => expect(mockSetup).toHaveBeenCalled())
    await waitFor(() => expect(mockActivate).toHaveBeenCalled())
  })
})
