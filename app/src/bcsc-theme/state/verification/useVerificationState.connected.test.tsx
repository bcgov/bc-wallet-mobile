import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook } from '@testing-library/react-native'
import React from 'react'
import { useVerificationState } from './useVerificationState'

describe('useVerificationState with the real store', () => {
  it('re-derives when the user becomes verified', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <BasicAppContext>{children}</BasicAppContext>
    const { result } = renderHook(
      () => {
        const [, dispatch] = useStore<BCState>()
        return { dispatch, state: useVerificationState() }
      },
      { wrapper }
    )
    expect(result.current.state).toMatchObject({ isVerified: false, needsVerification: true })

    act(() => {
      result.current.dispatch({ type: BCDispatchAction.UPDATE_SECURE_VERIFIED, payload: [true] })
    })

    expect(result.current.state).toMatchObject({ isVerified: true, needsVerification: false })
  })
})
