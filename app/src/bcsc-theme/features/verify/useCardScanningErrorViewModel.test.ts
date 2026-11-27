import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import { act, renderHook } from '@testing-library/react-native'
import { useCardScanningErrorViewModel } from './useCardScanningErrorViewModel'

const mockEnterNonBcscFlow = jest.fn()
jest.mock('./useEnterNonBcscFlow', () => ({
  useEnterNonBcscFlow: () => ({ enterNonBcscFlow: mockEnterNonBcscFlow }),
}))

describe('useCardScanningErrorViewModel', () => {
  let navigation: { navigate: jest.Mock; replace: jest.Mock; goBack: jest.Mock; dispatch: jest.Mock }

  const renderViewModel = () => renderHook(() => useCardScanningErrorViewModel(navigation as never)).result

  beforeEach(() => {
    jest.clearAllMocks()
    navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), dispatch: jest.fn() }
    mockEnterNonBcscFlow.mockResolvedValue(undefined)
  })

  it('opens the help centre to check the card', () => {
    const result = renderViewModel()

    act(() => result.current.handleCheckCard())

    expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifyWebView, {
      title: 'BCSC.Screens.HelpCentre',
      url: HelpCentreUrl.HELP_CHECK_BCSC,
    })
  })

  it('goes back to the scanner to scan again', () => {
    const result = renderViewModel()

    act(() => result.current.handleScanAgain())

    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  it('replaces itself with manual serial entry', () => {
    const result = renderViewModel()

    act(() => result.current.handleEnterManually())

    expect(navigation.replace).toHaveBeenCalledWith(BCSCScreens.ManualSerial)
  })

  it('enters the non-BCSC flow at the two-ID notice', async () => {
    const result = renderViewModel()

    await act(() => result.current.handleUseAnotherId())

    expect(mockEnterNonBcscFlow).toHaveBeenCalledWith(
      [{ name: BCSCScreens.DualIdentificationRequired }],
      'User chose to try another card'
    )
  })
})
