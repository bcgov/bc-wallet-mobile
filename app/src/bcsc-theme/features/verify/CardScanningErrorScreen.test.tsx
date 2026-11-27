import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { BCState, initialState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { bifoldLoggerInstance, testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import CardScanningErrorScreen from './CardScanningErrorScreen'

const mockUpdateCardProcess = jest.fn()
const mockDeleteScannedCardData = jest.fn()
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateCardProcess: mockUpdateCardProcess,
    deleteScannedCardData: mockDeleteScannedCardData,
  })),
}))

describe('CardScanningErrorScreen', () => {
  // The container's init() swaps in this shared logger, whatever BasicAppContext registers.
  const infoSpy = jest.spyOn(bifoldLoggerInstance, 'info').mockImplementation(() => undefined)
  let mockNavigation: { navigate: jest.Mock; replace: jest.Mock; goBack: jest.Mock; dispatch: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), dispatch: jest.fn() }
  })

  afterAll(() => {
    infoSpy.mockRestore()
  })

  const renderScreen = (state?: Partial<BCState>) =>
    render(
      <BasicAppContext initialStateOverride={state}>
        <CardScanningErrorScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

  const pressUseAnotherId = async (screen: ReturnType<typeof renderScreen>) => {
    await act(async () => {
      fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.verify.cardScanningError.useAnotherId)))
    })
  }

  it('renders the error copy', () => {
    const screen = renderScreen()

    expect(screen.getByText('BCSC.CardScanningError.Heading')).toBeTruthy()
    // The description and the help link share a Text, so match the description by prefix.
    expect(screen.getByText(/^BCSC\.CardScanningError\.Description/)).toBeTruthy()
    expect(screen.getByText('BCSC.CardScanningError.ProblemsContinue')).toBeTruthy()
    expect(screen.getByText('BCSC.CardScanningError.UseAnotherID')).toBeTruthy()
  })

  it('opens the help centre from the check card link', () => {
    const screen = renderScreen()

    fireEvent.press(screen.getByText('BCSC.CardScanningError.CheckCardLink'))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifyWebView, {
      title: 'BCSC.Screens.HelpCentre',
      url: HelpCentreUrl.HELP_CHECK_BCSC,
    })
  })

  it('returns to the scanner on scan again', () => {
    const screen = renderScreen()

    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.verify.cardScanningError.scanAgain)))

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1)
  })

  it('replaces itself with manual serial entry on enter manually', () => {
    const screen = renderScreen()

    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.verify.cardScanningError.enterManually)))

    expect(mockNavigation.replace).toHaveBeenCalledWith(BCSCScreens.ManualSerial)
  })

  describe('use another ID', () => {
    it('enters the non-BCSC flow above IdentitySelection', async () => {
      const screen = renderScreen()

      await pressUseAnotherId(screen)

      // The stack rewrite itself is covered by pop-to-then-navigate.test.ts.
      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1)
      expect(mockNavigation.dispatch).toHaveBeenCalledWith(expect.any(Function))
      expect(mockNavigation.replace).not.toHaveBeenCalled()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
      expect(mockUpdateCardProcess).toHaveBeenCalledWith(BCSCCardProcess.NonBCSC)
    })

    it('saves the card process before leaving the screen', async () => {
      const screen = renderScreen()
      mockUpdateCardProcess.mockImplementation(() => {
        expect(mockNavigation.dispatch).not.toHaveBeenCalled()
      })

      await pressUseAnotherId(screen)

      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1)
    })

    it('logs the choice without any card data', async () => {
      const screen = renderScreen({
        bcscSecure: { ...initialState.bcscSecure, serial: 'K12345678', birthdate: new Date(1982, 0, 4) },
      })

      await pressUseAnotherId(screen)

      expect(infoSpy).toHaveBeenCalledWith(
        '[CardScanningError] User chose to try another card, entering the non-BCSC flow'
      )
      expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('K12345678')
    })

    it('clears a previously scanned serial and birthdate', async () => {
      const screen = renderScreen({
        bcscSecure: { ...initialState.bcscSecure, serial: 'K12345678', birthdate: new Date(1982, 0, 4) },
      })

      await pressUseAnotherId(screen)

      expect(mockDeleteScannedCardData).toHaveBeenCalledTimes(1)
    })

    it('leaves card data alone when nothing was scanned', async () => {
      const screen = renderScreen()

      await pressUseAnotherId(screen)

      expect(mockDeleteScannedCardData).not.toHaveBeenCalled()
    })
  })
})
