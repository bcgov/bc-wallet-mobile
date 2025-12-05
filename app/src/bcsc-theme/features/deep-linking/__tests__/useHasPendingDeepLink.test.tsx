import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { DeepLinkViewModelProvider } from '../DeepLinkViewModelContext'
import { useHasPendingDeepLink } from '../useHasPendingDeepLink'

const createMockViewModel = (initialPending = false) => {
  let pending = initialPending
  let listener: ((p: boolean) => void) | null = null

  const vm = {
    get hasPendingDeepLink() {
      return pending
    },
    onPendingStateChange(cb: (p: boolean) => void) {
      listener = cb
      cb(pending)
      return () => {
        listener = null
      }
    },
    emit(next: boolean) {
      pending = next
      listener?.(next)
    },
  } as any

  return vm
}

describe('useHasPendingDeepLink', () => {
  it('returns initial pending state from view model', () => {
    const viewModel = createMockViewModel(true)

    const { result } = renderHook(() => useHasPendingDeepLink(), {
      wrapper: ({ children }) => (
        <DeepLinkViewModelProvider viewModel={viewModel}>{children}</DeepLinkViewModelProvider>
      ),
    })

    expect(result.current).toBe(true)
  })

  it('updates when pending state changes', () => {
    const viewModel = createMockViewModel(false)

    const { result } = renderHook(() => useHasPendingDeepLink(), {
      wrapper: ({ children }) => (
        <DeepLinkViewModelProvider viewModel={viewModel}>{children}</DeepLinkViewModelProvider>
      ),
    })

    expect(result.current).toBe(false)

    act(() => viewModel.emit(true))
    expect(result.current).toBe(true)

    act(() => viewModel.emit(false))
    expect(result.current).toBe(false)
  })
})
