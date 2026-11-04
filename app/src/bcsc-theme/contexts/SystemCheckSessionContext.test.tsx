import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { SystemCheckSessionProvider, useRunRegistry, useSystemCheckSession } from './SystemCheckSessionContext'

describe('useRunRegistry', () => {
  it('claims a run once and reports its status as it goes', () => {
    const { result } = renderHook(() => useRunRegistry())
    expect(result.current.getRunStatus('batch')).toBeUndefined()

    let finish: (() => void) | undefined
    act(() => {
      finish = result.current.startRun('batch')
    })

    expect(finish).toBeDefined()
    expect(result.current.getRunStatus('batch')).toBe('running')
    // A second claim is refused while the run is in progress
    expect(result.current.startRun('batch')).toBeUndefined()

    act(() => finish?.())

    expect(result.current.getRunStatus('batch')).toBe('settled')
    // and once it has settled
    expect(result.current.startRun('batch')).toBeUndefined()
  })

  it('refuses a second claim made before the first has re-rendered', () => {
    const { result } = renderHook(() => useRunRegistry())
    let first: (() => void) | undefined
    let second: (() => void) | undefined

    act(() => {
      first = result.current.startRun('batch')
      second = result.current.startRun('batch')
    })

    expect(first).toBeDefined()
    expect(second).toBeUndefined()
  })

  it('keeps runs apart by key', () => {
    const { result } = renderHook(() => useRunRegistry())

    act(() => {
      result.current.startRun('unverified')?.()
    })

    expect(result.current.getRunStatus('unverified')).toBe('settled')
    expect(result.current.getRunStatus('verified')).toBeUndefined()

    let claimed: (() => void) | undefined
    act(() => {
      claimed = result.current.startRun('verified')
    })

    expect(claimed).toBeDefined()
  })

  it('forgets every run on reset, and ignores a finish from before it', () => {
    const { result } = renderHook(() => useRunRegistry())
    let staleFinish: (() => void) | undefined
    act(() => {
      staleFinish = result.current.startRun('batch')
    })

    act(() => result.current.reset())
    expect(result.current.getRunStatus('batch')).toBeUndefined()

    // The registry's next life claims the run afresh; the stale finish must not settle it
    act(() => {
      expect(result.current.startRun('batch')).toBeDefined()
    })
    act(() => staleFinish?.())

    expect(result.current.getRunStatus('batch')).toBe('running')
  })
})

describe('SystemCheckSessionProvider', () => {
  /** Renders under a provider whose `enabled` the test flips, as RootStack does across lock and unlock. */
  const renderSession = (initialEnabled = true) => {
    let enabled = initialEnabled
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SystemCheckSessionProvider enabled={enabled}>{children}</SystemCheckSessionProvider>
    )
    const utils = renderHook(() => useSystemCheckSession(), { wrapper })
    const setEnabled = (next: boolean) => {
      enabled = next
      utils.rerender(undefined)
    }

    return { ...utils, setEnabled }
  }

  it('clears the record when the session ends, so the next session runs its checks again', () => {
    const { result, setEnabled } = renderSession()

    act(() => {
      result.current?.startRun('batch')?.()
    })
    expect(result.current?.getRunStatus('batch')).toBe('settled')

    setEnabled(false)
    expect(result.current?.getRunStatus('batch')).toBeUndefined()

    setEnabled(true)
    let claimed: (() => void) | undefined
    act(() => {
      claimed = result.current?.startRun('batch')
    })

    expect(claimed).toBeDefined()
  })

  it('is absent outside the provider', () => {
    const { result } = renderHook(() => useSystemCheckSession())

    expect(result.current).toBeNull()
  })
})
