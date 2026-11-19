import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { RootPhase } from './root-phase'
import { useRootPhase } from './useRootPhase'

describe('useRootPhase with the real store', () => {
  it('re-derives when the store or the routing facts change', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <BasicAppContext>{children}</BasicAppContext>
    const { result, rerender } = renderHook(
      ({ showVerifyStack }: { showVerifyStack: boolean }) => {
        const [, dispatch] = useStore<BCState>()
        const phase = useRootPhase({ appReady: true, awaitingStatusForResume: false, showVerifyStack })

        return { dispatch, phase }
      },
      { wrapper, initialProps: { showVerifyStack: false } }
    )
    expect(result.current.phase).toBe(RootPhase.Onboarding)

    // Creating the PIN completes onboarding: the account exists and the app is unlocked
    act(() => {
      result.current.dispatch({ type: BCDispatchAction.SUCCESSFUL_AUTH })
    })

    expect(result.current.phase).toBe(RootPhase.Main)

    rerender({ showVerifyStack: true })

    expect(result.current.phase).toBe(RootPhase.Verify)
  })
})
