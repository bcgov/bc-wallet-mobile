import * as useAlertsModule from '@/hooks/useAlerts'
import * as Bifold from '@bifold/core'
import { useNavigation } from '@react-navigation/core'
import { act, renderHook } from '@testing-library/react-native'
import { deleteToken, getAccount, TokenType } from 'react-native-bcsc-core'
import { readDeviceRegistration } from '../services/device-registration'
import * as useRegistrationServiceModule from '../services/hooks/useRegistrationService'
import * as useSecureActionsModule from './useSecureActions'
import { useVerificationReset } from './useVerificationReset'

jest.mock('@bifold/core')
jest.mock('@react-navigation/core', () => ({
  useNavigation: jest.fn(),
}))
jest.mock('@/hooks/useAlerts', () => ({
  useAlerts: jest.fn(),
}))
jest.mock('react-native-bcsc-core', () => ({
  deleteToken: jest.fn(),
  getAccount: jest.fn(),
  isAccountRegistered: jest.fn((account?: { clientID?: string } | null) => Boolean(account?.clientID)),
  TokenType: {
    Refresh: 'Refresh',
    Access: 'Access',
    Registration: 'Registration',
  },
}))
jest.mock('../services/hooks/useRegistrationService', () => ({
  useRegistrationService: jest.fn(),
}))
// The registration's owner: the reset reads the registration from it and clears it through it
jest.mock('../services/device-registration', () => ({
  readDeviceRegistration: jest.fn(),
}))
jest.mock('./useSecureActions', () => ({
  useSecureActions: jest.fn(),
}))

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
}

const mockNavigation = {
  navigate: jest.fn(),
  dispatch: jest.fn(),
}

const mockFactoryResetAlert = jest.fn()
const mockClearSecureState = jest.fn()
const mockDeleteVerificationData = jest.fn().mockResolvedValue(undefined)
const mockClearRegistration = jest.fn().mockResolvedValue(undefined)
const mockDeleteRegistration = jest.fn().mockResolvedValue({ success: true })
const mockCreateRegistration = jest.fn().mockResolvedValue({})

const account = { clientID: 'client-id', securityMethod: 'device_authentication' }
const storedRegistration = {
  clientId: 'client-id',
  issuer: 'https://idsit.gov.bc.ca/device/',
  registrationAccessToken: 'registration-token',
}

describe('useVerificationReset', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest.mocked(Bifold.useStore).mockReturnValue([
      {
        bcscSecure: {
          walletKey: 'wallet-key',
          securityMethod: 'device_authentication',
          // Not what the reset uses: the registration is read from storage
          registrationAccessToken: 'state-token',
          savedServices: ['service-a', 'service-b'],
        },
      } as any,
      jest.fn(),
    ])
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(useNavigation).mockReturnValue(mockNavigation as any)
    jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
      factoryResetAlert: mockFactoryResetAlert,
    } as any)
    jest.mocked(useSecureActionsModule.useSecureActions).mockReturnValue({
      clearSecureState: mockClearSecureState,
      clearRegistration: mockClearRegistration,
      deleteVerificationData: mockDeleteVerificationData,
    } as any)
    jest.mocked(useRegistrationServiceModule.useRegistrationService).mockReturnValue({
      deleteRegistration: mockDeleteRegistration,
      createRegistration: mockCreateRegistration,
    } as any)
    jest.mocked(getAccount).mockResolvedValue(account as any)
    jest.mocked(readDeviceRegistration).mockResolvedValue(storedRegistration)
    jest.mocked(deleteToken).mockResolvedValue(true)
  })

  it('account is renewed successfully', async () => {
    const { result } = renderHook(() => useVerificationReset())

    await act(async () => {
      await result.current()
    })

    expect(mockClearSecureState).toHaveBeenCalledWith({
      isHydrated: true,
      walletKey: 'wallet-key',
      securityMethod: 'device_authentication',
      registrationAccessToken: 'registration-token',
      verified: false,
      inVerifyFlow: false,
    })
    expect(getAccount).toHaveBeenCalledTimes(1)
    // The client ID and its token are the pair storage holds, read for the account the reset runs on
    expect(readDeviceRegistration).toHaveBeenCalledWith(account)
    expect(mockDeleteRegistration).toHaveBeenCalledWith('registration-token', 'client-id')
    expect(mockDeleteVerificationData).toHaveBeenCalledTimes(1)
    // The registration token is never deleted on its own: it goes with its client ID
    expect(deleteToken).toHaveBeenCalledTimes(2)
    expect(deleteToken).toHaveBeenNthCalledWith(1, TokenType.Access)
    expect(deleteToken).toHaveBeenNthCalledWith(2, TokenType.Refresh)
    expect(mockClearRegistration).toHaveBeenCalledTimes(1)
    expect(mockCreateRegistration).toHaveBeenCalledWith()
    expect(mockFactoryResetAlert).not.toHaveBeenCalled()
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('clears the old registration after the other tokens and before the new one is created', async () => {
    const { result } = renderHook(() => useVerificationReset())

    await act(async () => {
      await result.current()
    })

    // iOS stores the access and refresh tokens under the client ID the clear removes
    const lastTokenDelete = Math.max(...jest.mocked(deleteToken).mock.invocationCallOrder)
    const cleared = mockClearRegistration.mock.invocationCallOrder[0]
    expect(mockDeleteRegistration.mock.invocationCallOrder[0]).toBeLessThan(cleared)
    expect(lastTokenDelete).toBeLessThan(cleared)
    expect(cleared).toBeLessThan(mockCreateRegistration.mock.invocationCallOrder[0])
  })

  it('never logs the client ID or the registration token', async () => {
    const { result } = renderHook(() => useVerificationReset())

    await act(async () => {
      await result.current()
    })

    const logged = JSON.stringify([...mockLogger.info.mock.calls, ...mockLogger.error.mock.calls])
    expect(logged).not.toContain('client-id')
    expect(logged).not.toContain('registration-token')
  })

  it('can keep the user in the verify flow for a reset that happens inside it', async () => {
    const { result } = renderHook(() => useVerificationReset())

    await act(async () => {
      await result.current({ inVerifyFlow: true })
    })

    // Backing out of identity selection pops to the setup question; the stack must stay mounted
    expect(mockClearSecureState).toHaveBeenCalledWith(expect.objectContaining({ verified: false, inVerifyFlow: true }))
    expect(mockCreateRegistration).toHaveBeenCalledWith()
  })

  it('clears the facts in memory before the native deletes, so a failed delete leaves the reset incomplete', async () => {
    mockDeleteVerificationData.mockRejectedValueOnce(new Error('delete failed'))

    const { result } = renderHook(() => useVerificationReset())
    let completed: boolean | undefined
    await act(async () => {
      completed = await result.current()
    })

    // The surviving native record is read back at the next unlock
    expect(completed).toBe(false)
    expect(mockClearSecureState).toHaveBeenCalledWith(expect.objectContaining({ verified: false, inVerifyFlow: false }))
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
    expect(mockClearRegistration).not.toHaveBeenCalled()
    expect(mockCreateRegistration).not.toHaveBeenCalled()
  })

  it('shows the factory reset alert, touching nothing, when the device holds no registration', async () => {
    // e.g. a client ID whose token was lost: there is nothing to delete on the server or to clear with
    jest.mocked(readDeviceRegistration).mockResolvedValue(null)

    const { result } = renderHook(() => useVerificationReset())
    let completed: boolean | undefined
    await act(async () => {
      completed = await result.current()
    })

    expect(completed).toBe(false)
    expect(mockClearSecureState).not.toHaveBeenCalled()
    expect(mockDeleteRegistration).not.toHaveBeenCalled()
    expect(mockDeleteVerificationData).not.toHaveBeenCalled()
    expect(mockClearRegistration).not.toHaveBeenCalled()
    expect(mockCreateRegistration).not.toHaveBeenCalled()
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
  })

  it('does not register again when the old registration cannot be cleared', async () => {
    mockClearRegistration.mockRejectedValueOnce(new Error('clear failed'))

    const { result } = renderHook(() => useVerificationReset())
    let completed: boolean | undefined
    await act(async () => {
      completed = await result.current()
    })

    expect(completed).toBe(false)
    expect(mockCreateRegistration).not.toHaveBeenCalled()
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
  })

  it('shows the factory reset alert when the account has no registration', async () => {
    jest.mocked(getAccount).mockResolvedValue({ securityMethod: 'device_authentication' } as any)

    const { result } = renderHook(() => useVerificationReset())

    await act(async () => {
      await result.current()
    })

    expect(readDeviceRegistration).not.toHaveBeenCalled()
    expect(mockClearSecureState).not.toHaveBeenCalled()
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
  })

  it('shows the factory reset alert when no account exists', async () => {
    jest.mocked(getAccount).mockResolvedValue(null)

    const { result } = renderHook(() => useVerificationReset())

    await act(async () => {
      await result.current()
    })

    expect(mockClearSecureState).not.toHaveBeenCalled()
    expect(mockDeleteRegistration).not.toHaveBeenCalled()
    expect(mockCreateRegistration).not.toHaveBeenCalled()
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[useVerificationReset] Error during account renewal reset',
      expect.any(Error)
    )
  })

  it('shows the factory reset alert when re-registration fails', async () => {
    mockCreateRegistration.mockRejectedValueOnce(new Error('create failed'))

    const { result } = renderHook(() => useVerificationReset())

    await act(async () => {
      await result.current()
    })

    expect(mockClearSecureState).toHaveBeenCalledTimes(1)
    expect(mockDeleteVerificationData).toHaveBeenCalledTimes(1)
    expect(mockDeleteRegistration).toHaveBeenCalledWith('registration-token', 'client-id')
    // The old registration was cleared first, so the account is left with none rather than with a
    // client ID the server has deleted
    expect(mockClearRegistration).toHaveBeenCalledTimes(1)
    expect(mockCreateRegistration).toHaveBeenCalledWith()
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[useVerificationReset] Error during account renewal reset',
      expect.any(Error)
    )
  })
})
