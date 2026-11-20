import { seedBCSCStoreFromBCState } from '@/bcsc-theme/storage/testing'
import { act, renderHook } from '@testing-library/react-native'
import { useVerificationState } from './useVerificationState'

describe('useVerificationState with the real store', () => {
  it('re-derives when the user becomes verified', () => {
    const { result } = renderHook(() => useVerificationState())
    expect(result.current).toMatchObject({ isVerified: false, needsVerification: true })

    act(() => {
      seedBCSCStoreFromBCState({ bcscSecure: { verified: true } })
    })

    expect(result.current).toMatchObject({ isVerified: true, needsVerification: false })
  })
})
