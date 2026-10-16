import { BCState, initialState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import { createVerifyHelpMenuButton, VerifyHelpMenuButtonOptions } from './FloatingHelpMenuHeaderButton'

const mockLeaveVerification = jest.fn()
jest.mock('../hooks/useLeaveVerification', () => ({
  __esModule: true,
  useLeaveVerification: () => mockLeaveVerification,
  default: () => mockLeaveVerification,
}))

// useRestartVerification needs the loading-screen context; the row only has to exist here
const mockPromptRestartVerification = jest.fn()
jest.mock('../hooks/useRestartVerification', () => ({
  useRestartVerification: () => mockPromptRestartVerification,
}))

const BACK_TO_HOME = 'BCSC.HelpMenu.BackToHome'
const RESTART = 'BCSC.HelpMenu.RestartVerification'

const FIRST_TIMER: Partial<BCState> = { bcsc: { ...initialState.bcsc, verificationSkipped: false } }
const DEFERRED: Partial<BCState> = { bcsc: { ...initialState.bcsc, verificationSkipped: true } }
const UNANSWERED: Partial<BCState> = { bcsc: { ...initialState.bcsc, verificationSkipped: undefined } }
const withDeveloperMode = (state: Partial<BCState>): Partial<BCState> => ({
  ...state,
  preferences: { ...initialState.preferences, developerModeEnabled: true },
})

describe('createVerifyHelpMenuButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  /** Renders the header button for the given user and opens its menu. */
  const openMenu = (state: Partial<BCState>, options?: VerifyHelpMenuButtonOptions) => {
    const VerifyHelpMenuButton = createVerifyHelpMenuButton(options)
    render(
      <BasicAppContext initialStateOverride={state}>
        <VerifyHelpMenuButton />
      </BasicAppContext>
    )
    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.common.help)))
    // The slide-in is animation frames on the JS driver; a second of fake time settles it
    act(() => jest.advanceTimersByTime(1000))
    expect(screen.getByText('BCSC.HelpMenu.ReportProblem')).toBeTruthy()
  }

  it('hides Back to home from a first-time verifier', () => {
    openMenu(FIRST_TIMER, { showRestartVerification: true })

    expect(screen.queryByText(BACK_TO_HOME)).toBeNull()
    expect(screen.getByText(RESTART)).toBeTruthy()
  })

  it('offers Back to home to a deferred verifier', () => {
    openMenu(DEFERRED, { showRestartVerification: true })

    expect(screen.getByText(BACK_TO_HOME)).toBeTruthy()
  })

  it('offers Back to home when the prompt was never answered (the row is a no-op there, and the prompt hides it)', () => {
    openMenu(UNANSWERED)

    expect(screen.getByText(BACK_TO_HOME)).toBeTruthy()
  })

  it('offers Back to home to a first-time verifier in developer mode', () => {
    openMenu(withDeveloperMode(FIRST_TIMER))

    expect(screen.getByText(BACK_TO_HOME)).toBeTruthy()
  })

  it('never offers Back to home when the screen opts out, developer mode or not', () => {
    openMenu(withDeveloperMode(DEFERRED), { showBackToHome: false })

    expect(screen.queryByText(BACK_TO_HOME)).toBeNull()
  })

  describe("the verify prompt's developer-only Back to home", () => {
    it('is hidden from a normal user, whoever they are', () => {
      openMenu(UNANSWERED, { showBackToHome: 'developerOnly' })

      expect(screen.queryByText(BACK_TO_HOME)).toBeNull()
    })

    it('is offered in developer mode and counts the prompt answered before leaving', () => {
      const onLeave = jest.fn()
      openMenu(withDeveloperMode(UNANSWERED), { showBackToHome: 'developerOnly', onLeave })

      fireEvent.press(screen.getByText(BACK_TO_HOME))

      // useLeaveVerification runs the callback (close the menu, answer the prompt) before it leaves
      expect(mockLeaveVerification).toHaveBeenCalledTimes(1)
      const [beforeLeave] = mockLeaveVerification.mock.calls[0] as [() => void]
      beforeLeave()
      expect(onLeave).toHaveBeenCalledTimes(1)
    })
  })

  it('shows Restart only once verification is underway', () => {
    openMenu(DEFERRED)

    expect(screen.queryByText(RESTART)).toBeNull()
  })

  it('leaves the flow from Back to home, closing the menu first', () => {
    openMenu(DEFERRED)

    fireEvent.press(screen.getByText(BACK_TO_HOME))

    expect(mockLeaveVerification).toHaveBeenCalledTimes(1)
    expect(mockLeaveVerification).toHaveBeenCalledWith(expect.any(Function))
  })

  it('prompts the restart confirmation from Restart verification process', () => {
    openMenu(FIRST_TIMER, { showRestartVerification: true })

    fireEvent.press(screen.getByText(RESTART))

    expect(mockPromptRestartVerification).toHaveBeenCalledWith(expect.any(Function))
  })
})
