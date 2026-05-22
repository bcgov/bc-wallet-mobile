import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { DispatchAction } from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import * as BcscCore from 'react-native-bcsc-core'
import useRegistrationApi from './useRegistrationApi'

jest.unmock('@/bcsc-theme/api/hooks/useFactoryReset')

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/hooks/useSecureActions')
jest.mock('./useRegistrationApi')
jest.mock('@/bcsc-theme/features/agent/BCSCAgentProvider', () => ({
  useBCSCAgentSafe: jest.fn(),
}))

const warnMock = jest.fn()

describe('useFactoryReset', () => {
  beforeEach(() => {
    jest.resetAllMocks()

    const useSecureActionsMock = jest.mocked(useSecureActions)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    jest.mocked(useBCSCAgentSafe).mockReturnValue(null)
  })

  it('should factory reset the device when successful', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: true })
    const registerMock = jest.fn()
    const dispatchMock = jest.fn()
    const clearSecureStateMock = jest.fn()
    const deleteSecureDataMock = jest.fn().mockResolvedValue(undefined)

    useBCSCApiClientStateMock.mockReturnValue({
      client: {
        clearTokens: jest.fn().mockResolvedValue(undefined),
      },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: deleteRegistrationMock,
      register: registerMock,
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: clearSecureStateMock,
      deleteSecureData: deleteSecureDataMock,
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      dispatchMock,
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      if (!result.success) {
        throw new Error(`Factory reset failed: ${result.error?.message}`)
      }
      expect(result.success).toBe(true)
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalledWith()
    expect(deleteRegistrationMock).toHaveBeenCalledWith('token', 'test-client-id')
    expect(deleteSecureDataMock).toHaveBeenCalledWith()
    expect(bcscCoreMock.removeAccount).toHaveBeenCalledWith()
    expect(clearSecureStateMock).toHaveBeenCalledWith()
    expect(dispatchMock.mock.calls[0]).toStrictEqual([{ type: BCDispatchAction.CLEAR_BCSC, payload: undefined }])
    expect(dispatchMock.mock.calls[1]).toStrictEqual([{ type: DispatchAction.DID_AUTHENTICATE, payload: [false] }])
  })

  it('should call getToken when registrationAccessToken is missing from store', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: true })
    const dispatchMock = jest.fn()
    const clearSecureStateMock = jest.fn()
    const deleteSecureDataMock = jest.fn().mockResolvedValue(undefined)

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: deleteRegistrationMock,
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    bcscCoreMock.getToken.mockResolvedValue({ token: 'native-token' } as any)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: clearSecureStateMock,
      deleteSecureData: deleteSecureDataMock,
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: undefined, additionalEvidenceData: [] } } as any,
      dispatchMock,
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(bcscCoreMock.getToken).toHaveBeenCalledWith(BcscCore.TokenType.Registration)
    expect(deleteRegistrationMock).toHaveBeenCalledWith('native-token', 'test-client-id')
  })

  it('should delete the wallet store and shut down the agent before clearing state', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteStoreMock = jest.fn().mockResolvedValue(undefined)
    const shutdownMock = jest.fn().mockResolvedValue(undefined)
    const clearSecureStateMock = jest.fn()
    const deleteSecureDataMock = jest.fn().mockResolvedValue(undefined)

    const callOrder: string[] = []
    deleteStoreMock.mockImplementation(async () => {
      callOrder.push('deleteStore')
    })
    shutdownMock.mockImplementation(async () => {
      callOrder.push('shutdown')
    })
    deleteSecureDataMock.mockImplementation(async () => {
      callOrder.push('deleteSecureData')
    })
    clearSecureStateMock.mockImplementation(() => {
      callOrder.push('clearSecureState')
    })

    jest.mocked(useBCSCAgentSafe).mockReturnValue({
      agent: { modules: { askar: { deleteStore: deleteStoreMock } }, shutdown: shutdownMock } as any,
      loading: false,
      error: null,
      retry: jest.fn(),
    })

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: jest.fn().mockResolvedValue({ success: true }),
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: clearSecureStateMock,
      deleteSecureData: deleteSecureDataMock,
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(deleteStoreMock).toHaveBeenCalledTimes(1)
    expect(shutdownMock).toHaveBeenCalledTimes(1)
    // deleteStore must run before key-clearing steps so the wallet is removed
    // while the agent still has a usable handle.
    expect(callOrder.indexOf('deleteStore')).toBeLessThan(callOrder.indexOf('deleteSecureData'))
    expect(callOrder.indexOf('deleteStore')).toBeLessThan(callOrder.indexOf('clearSecureState'))
  })

  it('should still succeed if askar.deleteStore() throws', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)
    const warnLogMock = jest.fn()

    jest.mocked(useBCSCAgentSafe).mockReturnValue({
      agent: {
        modules: { askar: { deleteStore: jest.fn().mockRejectedValue(new Error('boom')) } },
        shutdown: jest.fn().mockResolvedValue(undefined),
      } as any,
      loading: false,
      error: null,
      retry: jest.fn(),
    })

    useBCSCApiClientStateMock.mockReturnValue({
      client: { clearTokens: jest.fn() },
      isClientReady: true,
    } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: jest.fn().mockResolvedValue({ success: true }),
      register: jest.fn(),
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockResolvedValue(undefined)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), warn: warnLogMock, error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(warnLogMock).toHaveBeenCalledWith(
      expect.stringContaining('deleteStore() failed'),
      expect.objectContaining({ error: expect.any(Error) })
    )
  })

  it.todo('should factory reset with custom state when provided')

  it('should log a warning if account is null', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useApiMock = jest.mocked(useApi)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const infoMock = jest.fn()
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteRegistrationMock = jest.fn()

    useBCSCApiClientStateMock.mockReturnValue({ client: {}, isClientReady: true } as any)
    bcscCoreMock.getAccount.mockResolvedValue(null)
    useApiMock.mockImplementation(() => ({ registration: { deleteRegistration: deleteRegistrationMock } }) as any)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([{ bcscSecure: { additionalEvidenceData: [] } } as any, jest.fn()])
    bifoldMock.useServices.mockReturnValue([{ info: infoMock, error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      await hook.result.current()
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(warnMock).not.toHaveBeenCalled()
    expect(infoMock).toHaveBeenCalled()
    expect(deleteRegistrationMock).not.toHaveBeenCalled()
  })

  it('should log a warning if IAS account deletion fails', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    useBCSCApiClientStateMock.mockReturnValue({ client: {}, isClientReady: true } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn(), warn: warnMock }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      await hook.result.current()
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(warnMock).toHaveBeenCalled()
  })

  it('should return an error if local account file deletion fails', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useSecureActionsMock = jest.mocked(useSecureActions)
    const bifoldMock = jest.mocked(Bifold)
    const useRegistrationApiMock = jest.mocked(useRegistrationApi)
    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: true })

    useBCSCApiClientStateMock.mockReturnValue({ client: {}, isClientReady: true } as any)
    useRegistrationApiMock.mockReturnValue({
      deleteRegistration: deleteRegistrationMock,
    } as any)
    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockRejectedValue(new Error('Failed to remove account'))
    useSecureActionsMock.mockReturnValue({
      clearSecureState: jest.fn(),
      deleteSecureData: jest.fn().mockResolvedValue(undefined),
    } as any)
    bifoldMock.useStore.mockReturnValue([
      { bcscSecure: { registrationAccessToken: 'token', additionalEvidenceData: [] } } as any,
      jest.fn(),
    ])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn(), warn: warnMock }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      if (result.success) {
        expect(true).toBe(false) // Force fail if success is true
      } else {
        expect(result.success).toBe(false)
        expect(result.error.message).toContain('Failed to remove account')
      }
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(deleteRegistrationMock).toHaveBeenCalledWith('token', 'test-client-id')
    expect(bcscCoreMock.removeAccount).toHaveBeenCalled()
  })
})
