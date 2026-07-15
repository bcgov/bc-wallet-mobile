import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen, within } from '@testing-library/react-native'
import React from 'react'
import { SettingsContent } from './SettingsContent'

const tid = (key: string) => testIdWithKey(key)

const mockStatus = jest.fn()

jest.mock('@/utils/PushNotificationsHelper', () => ({
  NotificationPermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNKNOWN: 'unknown', BLOCKED: 'blocked' },
  status: (...args: unknown[]) => mockStatus(...args),
}))

const baseProps = {
  onContactUs: jest.fn(),
  onHelp: jest.fn(),
  onPrivacy: jest.fn(),
  onPressDeveloperMode: jest.fn(),
  onEditNickname: jest.fn(),
  onForgetAllPairings: jest.fn(),
  onAutoLock: jest.fn(),
  onAppSecurity: jest.fn(),
  onChangePIN: jest.fn(),
  onResetWallet: jest.fn(),
  onRemoveAccount: jest.fn(),
}

const renderWithState = (override: Record<string, unknown> = {}) =>
  render(
    <BasicAppContext initialStateOverride={override as never}>
      <BCSCLoadingProvider>
        <SettingsContent {...baseProps} />
      </BCSCLoadingProvider>
    </BasicAppContext>
  )

describe('SettingsContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStatus.mockResolvedValue('granted')
  })

  it('renders only public rows when unauthenticated', () => {
    renderWithState()
    expect(screen.queryByTestId(tid('AppSecurity'))).toBeNull()
    expect(screen.queryByTestId(tid('AnalyticsOptIn'))).toBeNull()
    expect(screen.getByTestId(tid('Help'))).toBeTruthy()
    expect(screen.getByTestId(tid('Privacy'))).toBeTruthy()
  })

  it('renders authenticated rows when authenticated', async () => {
    renderWithState({ authentication: { didAuthenticate: true }, bcscSecure: { verified: true } })
    expect(await screen.findByTestId(tid('AppSecurity'))).toBeTruthy()
    expect(screen.getByTestId(tid('AutoLock'))).toBeTruthy()
    expect(screen.getByTestId(tid('ForgetPairings'))).toBeTruthy()
    expect(screen.getByTestId(tid('AnalyticsOptIn'))).toBeTruthy()
    expect(screen.getByTestId(tid('ResetWallet'))).toBeTruthy()
    expect(screen.getByTestId(tid('RemoveAccount'))).toBeTruthy()
  })

  it('shows ChangePIN when security method is not device auth', async () => {
    renderWithState({
      authentication: { didAuthenticate: true },
    })
    expect(await screen.findByTestId(tid('ChangePIN'))).toBeTruthy()
  })

  it('shows the Notifications row ON when OS notification permission is granted', async () => {
    mockStatus.mockResolvedValue('granted')
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('Notifications'))
    expect(await within(row).findByText('ON')).toBeTruthy()
  })

  it('shows the Notifications row OFF when OS notification permission is denied', async () => {
    mockStatus.mockResolvedValue('denied')
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('Notifications'))
    expect(await within(row).findByText('OFF')).toBeTruthy()
  })

  it('shows OFF Notifications state while the permission status is unknown', async () => {
    mockStatus.mockResolvedValue('unknown')
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('Notifications'))
    expect(within(row).queryByText('ON')).toBeNull()
    expect(await within(row).findByText('OFF')).toBeTruthy()
  })

  it('renders the Analytics Opt-In row and accepts press without throwing', async () => {
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('AnalyticsOptIn'))
    fireEvent.press(row)
    expect(row).toBeTruthy()
  })

  it('invokes onHelp and onPrivacy from public rows', () => {
    renderWithState()
    fireEvent.press(screen.getByTestId(tid('Help')))
    fireEvent.press(screen.getByTestId(tid('Privacy')))
    expect(baseProps.onHelp).toHaveBeenCalled()
    expect(baseProps.onPrivacy).toHaveBeenCalled()
  })

  it('shows DeveloperMode row when developer mode is enabled and authenticated', async () => {
    renderWithState({
      authentication: { didAuthenticate: true },
      preferences: { developerModeEnabled: true } as never,
    })
    expect(await screen.findByTestId(tid('DeveloperMode'))).toBeTruthy()
  })

  it('opens external URL rows (Feedback, Accessibility, TermsOfUse)', async () => {
    const { Linking } = jest.requireActual('react-native')
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never)
    renderWithState()
    fireEvent.press(screen.getByTestId(tid('Feedback')))
    fireEvent.press(screen.getByTestId(tid('Accessibility')))
    fireEvent.press(screen.getByTestId(tid('TermsOfUse')))
    expect(spy).toHaveBeenCalledTimes(3)
    spy.mockRestore()
  })

  it('invokes onContactUs when ContactUs is pressed', () => {
    renderWithState()
    fireEvent.press(screen.getByTestId(tid('ContactUs')))
    expect(baseProps.onContactUs).toHaveBeenCalled()
  })

  it('invokes onPressDeveloperMode when DeveloperMode row is pressed', async () => {
    renderWithState({
      authentication: { didAuthenticate: true },
      preferences: { developerModeEnabled: true } as never,
    })
    fireEvent.press(await screen.findByTestId(tid('DeveloperMode')))
    expect(baseProps.onPressDeveloperMode).toHaveBeenCalled()
  })

  it('renders the ResetWallet row and invokes onResetWallet when pressed', async () => {
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('ResetWallet'))
    fireEvent.press(row)
    expect(baseProps.onResetWallet).toHaveBeenCalled()
  })

  it('hides ResetWallet row when onResetWallet is not provided', async () => {
    render(
      <BasicAppContext initialStateOverride={{ authentication: { didAuthenticate: true } } as never}>
        <BCSCLoadingProvider>
          <SettingsContent {...baseProps} onResetWallet={undefined} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )
    expect(screen.queryByTestId(tid('ResetWallet'))).toBeNull()
  })

  it('renders the RemoveAccount row and accepts press without throwing', async () => {
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('RemoveAccount'))
    fireEvent.press(row)
    expect(row).toBeTruthy()
  })

  it('hides the section content when its chevron is pressed, and shows it again on a second press', async () => {
    renderWithState()

    // Unauthenticated view renders exactly two collapsible sections: Help, then More Info.
    // Index 0 is the Help section's chevron.
    const [helpChevron] = screen.getAllByTestId(tid('SectionHeaderChevron'))

    expect(screen.getByTestId(tid('Help'))).toBeTruthy()
    expect(screen.getByTestId(tid('ContactUs'))).toBeTruthy()
    expect(screen.getByTestId(tid('Feedback'))).toBeTruthy()

    // NOTE: The chevron uses `preventDoublePress` under the hood,
    // this await triggers the next tick to ensure the second press
    // is not ignored by the double-press prevention logic.
    await fireEvent.press(helpChevron)

    expect(screen.queryByTestId(tid('Help'))).toBeNull()
    expect(screen.queryByTestId(tid('ContactUs'))).toBeNull()
    expect(screen.queryByTestId(tid('Feedback'))).toBeNull()
    // The other section's content is untouched.
    expect(screen.getByTestId(tid('Accessibility'))).toBeTruthy()
    expect(screen.getByTestId(tid('TermsOfUse'))).toBeTruthy()

    fireEvent.press(helpChevron)

    expect(screen.getByTestId(tid('Help'))).toBeTruthy()
    expect(screen.getByTestId(tid('ContactUs'))).toBeTruthy()
    expect(screen.getByTestId(tid('Feedback'))).toBeTruthy()
  })
})
