import BCSCApiClient from '@/bcsc-theme/api/client'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { DispatchAction } from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import * as BcscCore from 'react-native-bcsc-core'

jest.unmock('@/bcsc-theme/api/hooks/useFactoryReset')

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')

describe('useFactoryReset', () => {
  beforeEach(() => {
    jest.resetAllMocks()

    const useBCSCApiClientStateMock = jest.mocked(useBCSCApiClientState)
    useBCSCApiClientStateMock.mockReturnValue({
      client: {} as BCSCApiClient,
      isClientReady: true,
      error: null,
    })
  })

  it('should factory reset the device when successful', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useApiMock = jest.mocked(useApi)
    const bifoldMock = jest.mocked(Bifold)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: true })
    const registerMock = jest.fn()
    const dispatchMock = jest.fn()

    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    useApiMock.mockImplementation(
      () =>
        ({
          registration: {
            deleteRegistration: deleteRegistrationMock,
            register: registerMock,
          },
        }) as any,
    )
    bifoldMock.useStore.mockReturnValue([{ bcscSecure: { additionalEvidenceData: [] } } as any, dispatchMock])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      expect(result.success).toBe(true)
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalledWith()
    expect(deleteRegistrationMock).toHaveBeenCalledWith('test-client-id')
    expect(bcscCoreMock.removeAccount).toHaveBeenCalledWith()
    expect(dispatchMock.mock.calls[0]).toStrictEqual([{ type: BCDispatchAction.CLEAR_SECURE_STATE }])
    expect(dispatchMock.mock.calls[1]).toStrictEqual([{ type: BCDispatchAction.CLEAR_BCSC, payload: undefined }])
    expect(dispatchMock.mock.calls[2]).toStrictEqual([{ type: DispatchAction.DID_AUTHENTICATE, payload: [false] }])
  })

  it.todo('should factory reset with custom state when provided')

  it('should return an error if account is null', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useApiMock = jest.mocked(useApi)
    const bifoldMock = jest.mocked(Bifold)

    const deleteRegistrationMock = jest.fn()

    bcscCoreMock.getAccount.mockResolvedValue(null)
    useApiMock.mockImplementation(() => ({ registration: { deleteRegistration: deleteRegistrationMock } }) as any)
    bifoldMock.useStore.mockReturnValue([{ bcscSecure: { additionalEvidenceData: [] } } as any, jest.fn()])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      if (result.success) {
        expect(true).toBe(false) // Force fail if success is true
      } else {
        expect(result.success).toBe(false)
        expect(result.error.message).toContain('Local account')
      }
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(deleteRegistrationMock).not.toHaveBeenCalled()
  })

  it('should return an error if IAS account deletion fails', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useApiMock = jest.mocked(useApi)
    const bifoldMock = jest.mocked(Bifold)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: false })

    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    useApiMock.mockImplementation(() => ({ registration: { deleteRegistration: deleteRegistrationMock } }) as any)
    bifoldMock.useStore.mockReturnValue([{ bcscSecure: { additionalEvidenceData: [] } } as any, jest.fn()])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

    const hook = renderHook(() => useFactoryReset())

    await act(async () => {
      const result = await hook.result.current()
      if (result.success) {
        expect(true).toBe(false) // Force fail if success is true
      } else {
        expect(result.success).toBe(false)
        expect(result.error.message).toContain('IAS')
      }
    })

    expect(bcscCoreMock.getAccount).toHaveBeenCalled()
    expect(deleteRegistrationMock).toHaveBeenCalledWith('test-client-id')
  })

  it('should return an error if local account file deletion fails', async () => {
    const bcscCoreMock = jest.mocked(BcscCore)
    const useApiMock = jest.mocked(useApi)
    const bifoldMock = jest.mocked(Bifold)

    const deleteRegistrationMock = jest.fn().mockResolvedValue({ success: true })

    bcscCoreMock.getAccount.mockResolvedValue({ clientID: 'test-client-id' } as any)
    bcscCoreMock.removeAccount.mockRejectedValue(new Error('Failed to remove account'))
    useApiMock.mockImplementation(() => ({ registration: { deleteRegistration: deleteRegistrationMock } }) as any)
    bifoldMock.useStore.mockReturnValue([{ bcscSecure: { additionalEvidenceData: [] } } as any, jest.fn()])
    bifoldMock.useServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }] as any)

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
    expect(deleteRegistrationMock).toHaveBeenCalledWith('test-client-id')
    expect(bcscCoreMock.removeAccount).toHaveBeenCalled()
  })
})
