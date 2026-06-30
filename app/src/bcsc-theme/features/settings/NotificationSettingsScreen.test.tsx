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

const renderScreen = () =>
  render(
    <BasicAppContext>
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

  it('shows OS-settings instructions when permission was previously declined', async () => {
    mockStatus.mockResolvedValue(NPStatus.DENIED)
    mockHasPrompted.mockResolvedValue(true)

    renderScreen()

    expect(await screen.findByTestId(tid('OpenSettings'))).toBeTruthy()
  })

  it('requests permission and registers with the mediator when enabling', async () => {
    mockStatus.mockResolvedValue(NPStatus.UNKNOWN)
    mockHasPrompted.mockResolvedValue(false)

    renderScreen()

    fireEvent.press(await screen.findByTestId(tid('EnableNotifications')))

    await waitFor(() => expect(mockSetup).toHaveBeenCalled())
    await waitFor(() => expect(mockActivate).toHaveBeenCalled())
  })

  it('opens OS settings to turn off when permission is already granted', async () => {
    mockStatus.mockResolvedValue(NPStatus.GRANTED)
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never)

    renderScreen()

    fireEvent.press(await screen.findByTestId(tid('OpenNotificationSettings')))

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
