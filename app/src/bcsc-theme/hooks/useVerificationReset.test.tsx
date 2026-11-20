import { getBCSCState } from '@/bcsc-theme/storage/hooks'
import { nativeAccount, seedAccount, withBCSCStore } from '@/bcsc-theme/storage/testing'
import * as useAlertsModule from '@/hooks/useAlerts'
import * as Bifold from '@bifold/core'
import { useNavigation } from '@react-navigation/core'
import { act, renderHook } from '@testing-library/react-native'
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
  isAccountRegistered: (account: { clientID?: string } | null) => Boolean(account?.clientID),
}))
jest.mock('../services/hooks/useRegistrationService', () => ({
  useRegistrationService: jest.fn(),
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
const mockDeleteRegistration = jest.fn().mockResolvedValue({ success: true })
const mockCreateRegistration = jest.fn().mockResolvedValue({})

describe('useVerificationReset', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest.mocked(Bifold.useStore).mockReturnValue(
      withBCSCStore([
        {
          bcscSecure: {
            walletKey: 'wallet-key',
            securityMethod: 'device_authentication',
            registrationAccessToken: 'registration-token',
            savedServices: ['service-a', 'service-b'],
          },
        } as any,
        jest.fn(),
      ])
    )
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(useNavigation).mockReturnValue(mockNavigation as any)
    jest.mocked(useAlertsModule.useAlerts).mockReturnValue({
      factoryResetAlert: mockFactoryResetAlert,
    } as any)
    jest.mocked(useSecureActionsModule.useSecureActions).mockReturnValue({
      clearSecureState: mockClearSecureState,
      deleteVerificationData: mockDeleteVerificationData,
    } as any)
    jest.mocked(useRegistrationServiceModule.useRegistrationService).mockReturnValue({
      deleteRegistration: mockDeleteRegistration,
      createRegistration: mockCreateRegistration,
    } as any)
    seedAccount(nativeAccount({ clientID: 'client-id', securityMethod: 'device_authentication' as never }))
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
    expect(mockDeleteRegistration).toHaveBeenCalledWith('registration-token', 'client-id')
    expect(mockDeleteVerificationData).toHaveBeenCalledTimes(1)
    expect(getBCSCState().account.tokens).toBeUndefined()
    expect(mockCreateRegistration).toHaveBeenCalledWith('device_authentication')
    expect(mockFactoryResetAlert).not.toHaveBeenCalled()
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('can keep the user in the verify flow for a reset that happens inside it', async () => {
    const { result } = renderHook(() => useVerificationReset())

    await act(async () => {
      await result.current({ inVerifyFlow: true })
    })

    // Backing out of identity selection pops to the setup question; the stack must stay mounted
    expect(mockClearSecureState).toHaveBeenCalledWith(expect.objectContaining({ verified: false, inVerifyFlow: true }))
    expect(mockCreateRegistration).toHaveBeenCalledWith('device_authentication')
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
    expect(mockCreateRegistration).not.toHaveBeenCalled()
  })

  it('shows the factory reset alert when no account exists', async () => {
    seedAccount(null)

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
    expect(mockCreateRegistration).toHaveBeenCalledWith('device_authentication')
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[useVerificationReset] Error during account renewal reset',
      expect.any(Error)
    )
  })
})
