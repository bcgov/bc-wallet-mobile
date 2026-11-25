import { BCSCStoreSeed } from '@/bcsc-theme/storage/testing'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render, waitFor } from '@testing-library/react-native'
import { jwtDecode } from 'jwt-decode'
import React from 'react'
import { AccountSecurityMethod, createDeviceSignedJWT } from 'react-native-bcsc-core'
import { BCSCScreens } from '../../../types/navigators'
import TransferQRDisplayScreen from './TransferQRDisplayScreen'

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}))

const mockCheckAttestationStatus = jest.fn()
const mockAccountNotFoundAlert = jest.fn()

jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({
    accountNotFoundAlert: mockAccountNotFoundAlert,
  }),
}))

jest.mock('@/bcsc-theme/api/hooks/useApi', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    deviceAttestation: {
      checkAttestationStatus: mockCheckAttestationStatus,
    },
  })),
}))

const mockAccount = {
  id: 'mock-account-id',
  issuer: 'https://idsit.gov.bc.ca/device/',
  clientID: 'mock-client-id',
  securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
}

const mockProfile = {
  accountId: mockAccount.id,
  issuer: mockAccount.issuer,
  securityMethod: mockAccount.securityMethod,
}

// The account as the store's profile and registration. BasicAppContext resets the store, so it's seeded through it.
const withAccount: BCSCStoreSeed = {
  account: {
    profile: mockProfile,
    registration: { clientId: mockAccount.clientID, issuer: mockAccount.issuer },
  },
}

const withUnregisteredAccount: BCSCStoreSeed = { account: { profile: mockProfile } }

// Holds the createDeviceSignedJWT() await "in flight" so a test can control exactly when the
// signed JWT comes back, relative to unmount/completion.
const createDeferredJwt = () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('TransferQRDisplayScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(jwtDecode as jest.Mock).mockReturnValue({ jti: 'decoded-jti' })
    mockCheckAttestationStatus.mockResolvedValue(false)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', async () => {
    // Loading while the JWT is signed
    const tree = render(
      <BasicAppContext bcscState={withAccount}>
        <TransferQRDisplayScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()

    // Let the initial token creation settle inside act before the test ends
    await act(async () => {})
  })

  it('shows account not found alert when there is no account', async () => {
    render(
      <BasicAppContext>
        <TransferQRDisplayScreen />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(mockAccountNotFoundAlert).toHaveBeenCalled()
    })
  })

  it('shows the same alert, signing nothing, when the account has no registration', async () => {
    // The transfer token is signed as the device's client, and this account has no client ID
    render(
      <BasicAppContext bcscState={withUnregisteredAccount}>
        <TransferQRDisplayScreen />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(mockAccountNotFoundAlert).toHaveBeenCalled()
    })
    expect(createDeviceSignedJWT).not.toHaveBeenCalled()
  })

  describe('createToken', () => {
    it('creates a signed JWT and displays a QR code when account is found', async () => {
      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(createDeviceSignedJWT).toHaveBeenCalledWith(
          expect.objectContaining({
            aud: mockAccount.issuer,
            iss: mockAccount.clientID,
            sub: mockAccount.clientID,
          })
        )
      })
    })

    it('decodes the signed JWT to extract the actual jti', async () => {
      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(jwtDecode).toHaveBeenCalledWith('mock-jwt')
      })
    })

    it('starts polling for attestation status after QR code is created', async () => {
      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockCheckAttestationStatus).toHaveBeenCalledWith('decoded-jti')
      })
    })

    it('navigates to success when attestation status returns true', async () => {
      mockCheckAttestationStatus.mockResolvedValueOnce(true)

      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountSuccess)
      })
    })

    it('refreshes the QR code after the refresh interval', async () => {
      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(createDeviceSignedJWT).toHaveBeenCalledTimes(1)
      })

      // Advance past the 50 second refresh interval
      await act(async () => {
        jest.advanceTimersByTime(50000)
      })

      await waitFor(() => {
        expect(createDeviceSignedJWT).toHaveBeenCalledTimes(2)
      })
    })

    it('stops polling for attestation status after a successful attestation', async () => {
      // First call resolves true (success); any subsequent call would resolve false.
      mockCheckAttestationStatus.mockResolvedValueOnce(true).mockResolvedValue(false)

      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountSuccess)
      })

      const callsAfterSuccess = mockCheckAttestationStatus.mock.calls.length

      // Advance well past several attestation poll intervals (3s each)
      await act(async () => {
        jest.advanceTimersByTime(30000)
      })

      // No additional polls should have fired
      expect(mockCheckAttestationStatus).toHaveBeenCalledTimes(callsAfterSuccess)
    })

    it('stops refreshing the QR code after a successful attestation', async () => {
      mockCheckAttestationStatus.mockResolvedValueOnce(true).mockResolvedValue(false)

      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountSuccess)
      })

      const tokenCallsAfterSuccess = (createDeviceSignedJWT as jest.Mock).mock.calls.length

      // Advance past several QR refresh intervals (50s each)
      await act(async () => {
        jest.advanceTimersByTime(150000)
      })

      // No additional QR refreshes should have fired
      expect(createDeviceSignedJWT).toHaveBeenCalledTimes(tokenCallsAfterSuccess)
    })

    it('only navigates once even if multiple polls resolve as successful', async () => {
      // Every call returns success — without a completion latch the screen would
      // re-navigate on every resolved poll, snapping the user back from later screens.
      mockCheckAttestationStatus.mockResolvedValue(true)

      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountSuccess)
      })

      await act(async () => {
        jest.advanceTimersByTime(30000)
      })

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1)
    })

    it('clears polling intervals on unmount', async () => {
      const { unmount } = render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockCheckAttestationStatus).toHaveBeenCalled()
      })

      const pollsBeforeUnmount = mockCheckAttestationStatus.mock.calls.length
      const tokensBeforeUnmount = (createDeviceSignedJWT as jest.Mock).mock.calls.length

      unmount()

      await act(async () => {
        jest.advanceTimersByTime(150000)
      })

      expect(mockCheckAttestationStatus).toHaveBeenCalledTimes(pollsBeforeUnmount)
      expect(createDeviceSignedJWT).toHaveBeenCalledTimes(tokensBeforeUnmount)
    })

    it('falls back to the locally generated jti when jwtDecode returns no jti', async () => {
      jest.mocked(jwtDecode).mockReturnValue({}) // no jti in decoded token

      render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        // Should still poll — using the locally generated UUID as fallback
        expect(mockCheckAttestationStatus).toHaveBeenCalled()
      })

      // The jti used should be a UUID string, not undefined
      const calledWithJti = mockCheckAttestationStatus.mock.calls[0][0]
      expect(calledWithJti).toBeDefined()
      expect(typeof calledWithJti).toBe('string')
      expect(calledWithJti.length).toBeGreaterThan(0)
    })
  })

  // Regression coverage for issue #4273: on the source device, an in-flight createToken()
  // call could resolve *after* the screen unmounted (or after the transfer completed),
  // reinstalling an orphaned QR-refresh interval or firing the account-not-found (2822)
  // alert from a screen that no longer legitimately owns the check.
  describe('unmount and completion races (issue #4273)', () => {
    it('does not leave an orphaned QR-refresh interval running when unmounted while createToken is in flight', async () => {
      const deferredJwt = createDeferredJwt()
      jest.mocked(createDeviceSignedJWT).mockReturnValueOnce(deferredJwt.promise)

      const { unmount } = render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      expect(createDeviceSignedJWT).toHaveBeenCalledTimes(1)

      unmount()

      // The in-flight call resolves after teardown, as it would if the native module answered
      // late. Without the isMountedRef guard, refreshToken would still call startInterval()
      // here, installing a new 50s interval that nothing would ever clear.
      await act(async () => {
        deferredJwt.resolve('late-signed-jwt')
      })

      await act(async () => {
        jest.advanceTimersByTime(150000)
      })

      // No orphaned interval means no further createToken()/alert activity, ever.
      expect(createDeviceSignedJWT).toHaveBeenCalledTimes(1)
      expect(mockAccountNotFoundAlert).not.toHaveBeenCalled()
    })
  })

  // Copilot-flagged follow-up for issue #4273: createToken() can *throw* (rather than
  // resolve) when the native signer fails mid-removal. Both call sites (refreshToken's await,
  // and the QR-refresh interval's fire-and-forget call) must contain that rejection instead
  // of leaking it as an unhandled promise rejection.
  describe('createToken rejection handling (issue #4273 follow-up)', () => {
    it('contains a createToken rejection during refresh: no unhandled rejection and the QR-refresh interval is not started', async () => {
      const unhandledRejections: unknown[] = []
      const onUnhandledRejection = (reason: unknown) => {
        unhandledRejections.push(reason)
      }
      process.on('unhandledRejection', onUnhandledRejection)

      try {
        const rejectionError = new Error('native storage error')
        jest.mocked(createDeviceSignedJWT).mockRejectedValueOnce(rejectionError)

        render(
          <BasicAppContext bcscState={withAccount}>
            <TransferQRDisplayScreen />
          </BasicAppContext>
        )

        await waitFor(() => {
          expect(createDeviceSignedJWT).toHaveBeenCalledTimes(1)
        })

        // Give the rejection's microtask chain a chance to surface as an unhandled rejection,
        // as it would if refreshToken's try/catch didn't contain it (refreshToken is invoked
        // un-awaited from both the mount effect and the "Get New QR Code" button).
        await act(async () => {
          await Promise.resolve()
          await Promise.resolve()
        })

        expect(unhandledRejections).toHaveLength(0)

        // A failed refresh must not start the QR-refresh interval — advancing well past the
        // 50s mark should produce no further createToken() calls.
        await act(async () => {
          jest.advanceTimersByTime(150000)
        })

        expect(createDeviceSignedJWT).toHaveBeenCalledTimes(1)
        expect(mockAccountNotFoundAlert).not.toHaveBeenCalled()
      } finally {
        process.off('unhandledRejection', onUnhandledRejection)
      }
    })
  })

  // Copilot-flagged follow-up for issue #4273: createToken() guarded after reading the
  // account but not after the subsequent `await createDeviceSignedJWT(...)`. Add the
  // symmetric guard so a screen unmounted (or a transfer completed) while the JWT signing
  // await was in flight doesn't apply a stale QR update on the way back out.
  describe('post-JWT-signing guard (issue #4273 follow-up)', () => {
    it('does not apply a pending QR update after unmount when createDeviceSignedJWT resolves late', async () => {
      const deferredJwt = createDeferredJwt()
      jest.mocked(createDeviceSignedJWT).mockReturnValueOnce(deferredJwt.promise)

      const { unmount } = render(
        <BasicAppContext bcscState={withAccount}>
          <TransferQRDisplayScreen />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(createDeviceSignedJWT).toHaveBeenCalledTimes(1)
      })

      unmount()

      // The in-flight JWT signing resolves after teardown, as it would if the native signer
      // answered late. Without the post-JWT guard, the continuation would still run
      // jwtDecode/setQRValue/setIsLoading against an unmounted screen.
      await act(async () => {
        deferredJwt.resolve('late-signed-jwt')
      })

      // The guard must short-circuit before any of the post-JWT work — jwtDecode is the
      // first thing that work does, so it not being called proves setQRValue/setIsLoading
      // (and the QR value/render they'd produce) never ran either.
      expect(jwtDecode).not.toHaveBeenCalled()
    })
  })
})
