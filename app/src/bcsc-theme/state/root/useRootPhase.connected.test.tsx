import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { act, renderHook } from '@testing-library/react-native'
import { RootPhase } from './root-phase'
import { useRootPhase } from './useRootPhase'

describe('useRootPhase with the real store', () => {
  it('re-derives when the store or the routing facts change', async () => {
    const { result, rerender } = renderHook(
      ({ showVerifyStack }: { showVerifyStack: boolean }) =>
        useRootPhase({ appReady: true, awaitingStatusForResume: false, showVerifyStack }),
      { initialProps: { showVerifyStack: false } }
    )
    expect(result.current).toBe(RootPhase.Onboarding)

    // Creating the PIN completes onboarding: the account exists and the app is unlocked
    await act(async () => {
      await getBCSCState().account.createProfile({
        issuer: 'https://idsit.gov.bc.ca/device/',
        securityMethod: 'app_pin_no_device_authn' as never,
      })
      getBCSCState().session.setDidAuthenticate(true)
    })

    expect(result.current).toBe(RootPhase.Main)

    rerender({ showVerifyStack: true })

    expect(result.current).toBe(RootPhase.Verify)
  })
})
