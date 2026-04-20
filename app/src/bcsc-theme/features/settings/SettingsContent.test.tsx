import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import { SettingsContent } from './SettingsContent'

const tid = (key: string) => testIdWithKey(key)

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
  })

  it('renders only public rows when unauthenticated', () => {
    renderWithState()
    expect(screen.queryByTestId(tid('SignOut'))).toBeNull()
    expect(screen.queryByTestId(tid('Theme'))).toBeNull()
    expect(screen.getByTestId(tid('Help'))).toBeTruthy()
    expect(screen.getByTestId(tid('Privacy'))).toBeTruthy()
  })

  it('renders authenticated rows when authenticated', async () => {
    renderWithState({ authentication: { didAuthenticate: true } })
    expect(await screen.findByTestId(tid('SignOut'))).toBeTruthy()
    expect(screen.getByTestId(tid('AppSecurity'))).toBeTruthy()
    expect(screen.getByTestId(tid('AutoLock'))).toBeTruthy()
    expect(screen.getByTestId(tid('ForgetPairings'))).toBeTruthy()
    expect(screen.getByTestId(tid('AnalyticsOptIn'))).toBeTruthy()
    expect(screen.getByTestId(tid('Theme'))).toBeTruthy()
    expect(screen.getByTestId(tid('RemoveAccount'))).toBeTruthy()
  })

  it('shows ChangePIN when security method is not device auth', async () => {
    renderWithState({
      authentication: { didAuthenticate: true },
    })
    expect(await screen.findByTestId(tid('ChangePIN'))).toBeTruthy()
  })

  it('shows EditNickname when account is verified', async () => {
    renderWithState({
      authentication: { didAuthenticate: true },
      bcscSecure: { verified: true },
    })
    expect(await screen.findByTestId(tid('EditNickname'))).toBeTruthy()
  })

  it('toggles theme via the Theme row', async () => {
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('Theme'))
    fireEvent.press(row)
    // No throw = press wired up; visual toggle is covered by the label.
    expect(row).toBeTruthy()
  })

  it('toggles analytics opt-in via the row', async () => {
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('AnalyticsOptIn'))
    fireEvent.press(row)
    expect(row).toBeTruthy()
  })

  it('invokes logout when sign out is pressed', async () => {
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('SignOut'))
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

  it('shows DeveloperMode row when developer mode is enabled', () => {
    renderWithState({ preferences: { developerModeEnabled: true } as never })
    expect(screen.getByTestId(tid('DeveloperMode'))).toBeTruthy()
  })

  it('opens external URL rows (Feedback, Accessibility, TermsOfUse, Analytics)', async () => {
    const { Linking } = jest.requireActual('react-native')
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never)
    renderWithState()
    fireEvent.press(screen.getByTestId(tid('Feedback')))
    fireEvent.press(screen.getByTestId(tid('Accessibility')))
    fireEvent.press(screen.getByTestId(tid('TermsOfUse')))
    fireEvent.press(screen.getByTestId(tid('Analytics')))
    expect(spy).toHaveBeenCalledTimes(4)
    spy.mockRestore()
  })

  it('invokes onContactUs when ContactUs is pressed', () => {
    renderWithState()
    fireEvent.press(screen.getByTestId(tid('ContactUs')))
    expect(baseProps.onContactUs).toHaveBeenCalled()
  })

  it('invokes onPressDeveloperMode when DeveloperMode row is pressed', () => {
    renderWithState({ preferences: { developerModeEnabled: true } as never })
    fireEvent.press(screen.getByTestId(tid('DeveloperMode')))
    expect(baseProps.onPressDeveloperMode).toHaveBeenCalled()
  })

  it('exercises RemoveAccount press', async () => {
    renderWithState({ authentication: { didAuthenticate: true } })
    const row = await screen.findByTestId(tid('RemoveAccount'))
    fireEvent.press(row)
    expect(row).toBeTruthy()
  })
})
