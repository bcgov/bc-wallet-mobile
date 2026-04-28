import { act, renderHook } from '@testing-library/react-native'

import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import useFloatingScanButtonViewModel from './useFloatingScanButtonViewModel'

const mockNavigate = jest.fn()

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}))

describe('useFloatingScanButtonViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

    expect(mockNavigate).toHaveBeenCalledWith(BCSCStacks.Connect, { screen: 'Scan' })
  })
})
