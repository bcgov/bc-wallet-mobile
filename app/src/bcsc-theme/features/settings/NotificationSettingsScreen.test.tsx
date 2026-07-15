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

  it('reports "on" and opens device settings once prompted and permission is granted', async () => {
    mockStatus.mockResolvedValue(NPStatus.GRANTED)
    mockHasPrompted.mockResolvedValue(true)
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never)

    renderScreen()

    expect(await screen.findByText('BCSC.Settings.NotificationsStatusOn')).toBeTruthy()

    fireEvent.press(await screen.findByTestId(tid('OpenNotificationSettings')))
    expect(spy).toHaveBeenCalled()
    // The in-app enable flow is not offered once the user has been prompted.
    expect(screen.queryByTestId(tid('EnableNotifications'))).toBeNull()
    spy.mockRestore()
  })

  it('reports "off" with the device-settings redirect once prompted and permission is denied', async () => {
    mockStatus.mockResolvedValue(NPStatus.DENIED)
    mockHasPrompted.mockResolvedValue(true)

    renderScreen()

    expect(await screen.findByText('BCSC.Settings.NotificationsStatusOff')).toBeTruthy()
    expect(screen.getByTestId(tid('OpenNotificationSettings'))).toBeTruthy()
    expect(screen.queryByTestId(tid('EnableNotifications'))).toBeNull()
  })

  it('offers the in-app enable flow and registers with the mediator when never prompted', async () => {
    mockStatus.mockResolvedValue(NPStatus.UNKNOWN)
    mockHasPrompted.mockResolvedValue(false)

    renderScreen()

    fireEvent.press(await screen.findByTestId(tid('EnableNotifications')))

    await waitFor(() => expect(mockSetup).toHaveBeenCalled())
    await waitFor(() => expect(mockActivate).toHaveBeenCalled())
  })
})
