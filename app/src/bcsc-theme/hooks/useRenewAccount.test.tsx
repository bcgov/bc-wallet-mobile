import * as useAlertsModule from '@/hooks/useAlerts'
import { VerificationStatus } from '@/store'
import * as Bifold from '@bifold/core'
import { useNavigation } from '@react-navigation/core'
import { act, renderHook } from '@testing-library/react-native'
import { deleteToken, getAccount, getAccountSecurityMethod, TokenType } from 'react-native-bcsc-core'
import * as useRegistrationServiceModule from '../services/hooks/useRegistrationService'
import { useRenewAccount } from './useRenewAccount'
import * as useSecureActionsModule from './useSecureActions'

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
  getAccountSecurityMethod: jest.fn(),
  TokenType: {
    Refresh: 'Refresh',
    Access: 'Access',
    Registration: 'Registration',
  },
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

describe('useRenewalReset', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest.mocked(Bifold.useStore).mockReturnValue([
      {
        bcscSecure: {
          walletKey: 'wallet-key',
          registrationAccessToken: 'registration-token',
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
      deleteVerificationData: mockDeleteVerificationData,
    } as any)
    jest.mocked(useRegistrationServiceModule.useRegistrationService).mockReturnValue({
      deleteRegistration: mockDeleteRegistration,
      createRegistration: mockCreateRegistration,
    } as any)
    jest.mocked(getAccount).mockResolvedValue({ clientID: 'client-id' } as any)
    jest.mocked(getAccountSecurityMethod).mockResolvedValue('device_authentication' as any)
    jest.mocked(deleteToken).mockResolvedValue(true)
  })

  it('account is renewed successfully', async () => {
    const { result } = renderHook(() => useRenewAccount())

    await act(async () => {
      await result.current()
    })

    expect(mockClearSecureState).toHaveBeenCalledWith({
      isHydrated: true,
      walletKey: 'wallet-key',
      registrationAccessToken: 'registration-token',
      savedServices: ['service-a', 'service-b'],
      verified: false,
      verifiedStatus: VerificationStatus.UNVERIFIED,
    })
    expect(getAccount).toHaveBeenCalledTimes(1)
    expect(mockDeleteRegistration).toHaveBeenCalledWith('client-id')
    expect(getAccountSecurityMethod).toHaveBeenCalledTimes(1)
    expect(mockDeleteVerificationData).toHaveBeenCalledTimes(1)
    expect(deleteToken).toHaveBeenCalledTimes(3)
    expect(deleteToken).toHaveBeenNthCalledWith(1, TokenType.Refresh)
    expect(deleteToken).toHaveBeenNthCalledWith(2, TokenType.Access)
    expect(deleteToken).toHaveBeenNthCalledWith(3, TokenType.Registration)
    expect(mockCreateRegistration).toHaveBeenCalledWith('device_authentication')
    expect(mockFactoryResetAlert).not.toHaveBeenCalled()
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('shows the factory reset alert when no account exists', async () => {
    jest.mocked(getAccount).mockResolvedValue(null)

    const { result } = renderHook(() => useRenewAccount())

    await act(async () => {
      await result.current()
    })

    expect(mockClearSecureState).not.toHaveBeenCalled()
    expect(mockDeleteRegistration).not.toHaveBeenCalled()
    expect(mockCreateRegistration).not.toHaveBeenCalled()
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[useRenewalReset] Error during account renewal reset',
      expect.any(Error)
    )
  })

  it('shows the factory reset alert when re-registration fails', async () => {
    mockCreateRegistration.mockRejectedValueOnce(new Error('create failed'))

    const { result } = renderHook(() => useRenewAccount())

    await act(async () => {
      await result.current()
    })

    expect(mockClearSecureState).toHaveBeenCalledTimes(1)
    expect(mockDeleteVerificationData).toHaveBeenCalledTimes(1)
    expect(mockDeleteRegistration).toHaveBeenCalledWith('client-id')
    expect(mockCreateRegistration).toHaveBeenCalledWith('device_authentication')
    expect(mockFactoryResetAlert).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[useRenewalReset] Error during account renewal reset',
      expect.any(Error)
    )
  })
})
