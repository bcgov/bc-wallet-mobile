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
})
