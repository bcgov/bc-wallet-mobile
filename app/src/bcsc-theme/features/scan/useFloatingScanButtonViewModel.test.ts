import { renderHook } from '@testing-library/react-native'

import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import useFloatingScanButtonViewModel from './useFloatingScanButtonViewModel'

describe('useFloatingScanButtonViewModel', () => {
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
})
