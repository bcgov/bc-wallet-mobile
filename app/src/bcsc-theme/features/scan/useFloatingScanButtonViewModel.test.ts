import { act, renderHook } from '@testing-library/react-native'

import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import useFloatingScanButtonViewModel from './useFloatingScanButtonViewModel'

const mockNavigate = jest.fn()
const mockGetParent = jest.fn()

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    getParent: mockGetParent,
  }),
}))

describe('useFloatingScanButtonViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetParent.mockReturnValue({ navigate: mockNavigate })
  })

  it('is visible when the active tab is Home', () => {
    const { result } = renderHook(() => useFloatingScanButtonViewModel(BCSCScreens.Home))
    expect(result.current.isVisible).toBe(true)
  })

  it('is visible when the active tab is Wallet', () => {
    const { result } = renderHook(() => useFloatingScanButtonViewModel(BCSCScreens.Wallet))
    expect(result.current.isVisible).toBe(true)
  })

  it('is hidden when the active tab is Services', () => {
    const { result } = renderHook(() => useFloatingScanButtonViewModel(BCSCScreens.Services))
    expect(result.current.isVisible).toBe(false)
  })

  it('is hidden when the active tab is unknown or undefined', () => {
    const { result } = renderHook(() => useFloatingScanButtonViewModel(undefined))
    expect(result.current.isVisible).toBe(false)
  })

  it('navigates to the Connect stack Scan screen on press', () => {
    const { result } = renderHook(() => useFloatingScanButtonViewModel(BCSCScreens.Home))

    act(() => {
      result.current.onPress()
    })

    expect(mockGetParent).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(BCSCStacks.Connect, { screen: 'Scan' })
  })

  it('does not throw if there is no parent navigator', () => {
    mockGetParent.mockReturnValue(undefined)
    const { result } = renderHook(() => useFloatingScanButtonViewModel(BCSCScreens.Home))

    expect(() => {
      act(() => {
        result.current.onPress()
      })
    }).not.toThrow()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
