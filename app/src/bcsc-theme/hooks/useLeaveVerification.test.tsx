import { BCDispatchAction, VerificationStatus } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { useLeaveVerification } from './useLeaveVerification'

jest.mock('@bifold/core')

const mockDispatch = jest.fn()

describe('useLeaveVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold.useStore).mockReturnValue([{} as any, mockDispatch])
  })

  it('moves status out of IN_PROGRESS so the RootStack shows home', () => {
    const { result } = renderHook(() => useLeaveVerification())

    act(() => {
      result.current()
    })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS,
      payload: [VerificationStatus.UNVERIFIED],
    })
  })

  it('preserves progress — it does not dispatch any verification-data reset', () => {
    const { result } = renderHook(() => useLeaveVerification())

    act(() => {
      result.current()
    })

    // Only the routing dispatch; nothing that clears evidence/credential/auth-request.
    expect(mockDispatch).toHaveBeenCalledTimes(1)
  })

  it('runs the optional onLeave callback before leaving (e.g. to close the menu)', () => {
    const onLeave = jest.fn()
    const { result } = renderHook(() => useLeaveVerification())

    act(() => {
      result.current(onLeave)
    })

    expect(onLeave).toHaveBeenCalledTimes(1)
    // onLeave fires before the dispatches that unmount the VerifyStack.
    expect(onLeave.mock.invocationCallOrder[0]).toBeLessThan(mockDispatch.mock.invocationCallOrder[0])
  })

  it('does not throw when called without an onLeave callback', () => {
    const { result } = renderHook(() => useLeaveVerification())

    expect(() => act(() => result.current())).not.toThrow()
  })
})
