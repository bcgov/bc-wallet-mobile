import BCSCApiClient from '@/bcsc-theme/api/client'
import {
  _resetBCSCApiClientSingleton,
  BCSCApiClientContext,
  BCSCApiClientProvider,
} from '@/bcsc-theme/contexts/BCSCApiClientContext'
import * as Bifold from '@bifold/core'
import { renderHook, waitFor } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { useContext } from 'react'

jest.mock('@/bcsc-theme/api/client')

jest.mock('@bifold/core')

describe('BCSCApiClientProvider', () => {
  beforeEach(() => {
    _resetBCSCApiClientSingleton()
    jest.resetAllMocks()
  })

  it('should initialize the client', async () => {
    const bifoldMock = jest.mocked(Bifold)
    const bcscApiClientMock = jest.mocked(BCSCApiClient)

    const mockStore: any = {
      stateLoaded: true,
      developer: {
        environment: {
          iasApiBaseUrl: 'https://example.com',
        },
      },
    }
    const mockLogger: any = {}
    const dispatchMock = jest.fn()

    bifoldMock.useServices.mockReturnValue([mockLogger])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockResolvedValue(true)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
    )

    const { result } = renderHook(() => useContext(BCSCApiClientContext), { wrapper })

    await waitFor(() => {
      expect(result.current?.client).toBeDefined()
      expect(result.current?.client).toBeInstanceOf(BCSCApiClient)
      expect(result.current?.isClientReady).toBe(true)
      expect(result.current?.error).toBeNull()
      expect(bcscApiClientMock.prototype.fetchEndpointsAndConfig).toHaveBeenCalledTimes(1)
    })
  })

  it('should not initialize if store.stateLoaded is false', async () => {
    const bifoldMock = jest.mocked(Bifold)
    const bcscApiClientMock = jest.mocked(BCSCApiClient)

    const mockStore: any = {
      stateLoaded: false,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
    }
    const dispatchMock = jest.fn()
    bifoldMock.useServices.mockReturnValue([{}])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockResolvedValue(true)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
    )

    const { result } = renderHook(() => useContext(BCSCApiClientContext), { wrapper })

    // No initialization → stays false
    expect(result.current?.isClientReady).toBe(false)
    expect(result.current?.client).toBeNull()
    expect(result.current?.error).toBeNull()
    expect(bcscApiClientMock.prototype.fetchEndpointsAndConfig).not.toHaveBeenCalled()
  })

  it('should not initialize if iasApiBaseUrl is missing', async () => {
    const bifoldMock = jest.mocked(Bifold)
    const bcscApiClientMock = jest.mocked(BCSCApiClient)

    const mockStore: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: '' } },
    }
    const dispatchMock = jest.fn()
    bifoldMock.useServices.mockReturnValue([{}])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockResolvedValue(true)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
    )

    const { result } = renderHook(() => useContext(BCSCApiClientContext), { wrapper })

    expect(result.current?.isClientReady).toBe(false)
    expect(result.current?.client).toBeNull()
    expect(result.current?.error).toBeNull()
    expect(bcscApiClientMock.prototype.fetchEndpointsAndConfig).not.toHaveBeenCalled()
  })

  it('should use the singleton instance', async () => {
    const bifoldMock = jest.mocked(Bifold)
    const bcscApiClientMock = jest.mocked(BCSCApiClient)

    const mockStore: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
    }
    const dispatchMock = jest.fn()
    bifoldMock.useServices.mockReturnValue([{}])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockResolvedValue(true)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
    )

    const { result, rerender } = renderHook(() => useContext(BCSCApiClientContext), { wrapper })

    await waitFor(() => {
      expect(result.current?.isClientReady).toBe(true)
      expect(result.current?.client).toBeDefined()
      expect(result.current?.error).toBeNull()
      expect(bcscApiClientMock.prototype.fetchEndpointsAndConfig).toHaveBeenCalledTimes(1)
    })

    Object.assign(result.current?.client || {}, { baseURL: 'singleton' })

    rerender({})

    await waitFor(() => {
      expect(result.current?.isClientReady).toBe(true)
      expect(result.current?.client).toBeDefined()
      expect(result.current?.client?.baseURL).toBe('singleton')
      expect(result.current?.error).toBeNull()
      expect(bcscApiClientMock.prototype.fetchEndpointsAndConfig).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle initialization errors', async () => {
    const bifoldMock = jest.mocked(Bifold)
    const bcscApiClientMock = jest.mocked(BCSCApiClient)

    const mockStore: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
    }
    const dispatchMock = jest.fn()
    bifoldMock.useServices.mockReturnValue([{}])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest
      .fn()
      .mockRejectedValue(new Error('Initialization failed'))

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
    )

    const { result } = renderHook(() => useContext(BCSCApiClientContext), { wrapper })

    await waitFor(() => {
      expect(result.current?.isClientReady).toBe(false)
      expect(result.current?.client).toBeNull()
      expect(result.current?.error).toBeDefined()
      expect(result.current?.error).toContain('Initialization failed')
      expect(bcscApiClientMock.prototype.fetchEndpointsAndConfig).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle network errors gracefully during initialization', async () => {
    const bifoldMock = jest.mocked(Bifold)
    const bcscApiClientMock = jest.mocked(BCSCApiClient)

    const mockStore: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
    }
    const dispatchMock = jest.fn()
    bifoldMock.useServices.mockReturnValue([{}])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    const mockError: any = new AxiosError()
    mockError.isNetworkError = true

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockRejectedValue(mockError)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
    )

    const { result } = renderHook(() => useContext(BCSCApiClientContext), { wrapper })

    await waitFor(() => {
      expect(result.current?.isClientReady).toBe(true)
      expect(result.current?.client).toBeInstanceOf(BCSCApiClient)
      expect(result.current?.error).toBeNull()
      expect(bcscApiClientMock.prototype.fetchEndpointsAndConfig).toHaveBeenCalledTimes(1)
    })
  })

  it('should re-attempt initialization if iasApiBaseUrl changes', async () => {
    const bifoldMock = jest.mocked(Bifold)
    const bcscApiClientMock = jest.mocked(BCSCApiClient)
    const fetchMock = jest.fn()

    let store: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
    }
    const dispatchMock = jest.fn()
    bifoldMock.useServices.mockReturnValue([{}])
    bifoldMock.useStore.mockImplementation(() => [store, dispatchMock])

    bcscApiClientMock.mockImplementation(
      () =>
        ({
          fetchEndpointsAndConfig: fetchMock,
          baseURL: store.developer.environment.iasApiBaseUrl,
        }) as any
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
    )

    const { result, rerender } = renderHook(() => useContext(BCSCApiClientContext), { wrapper })

    await waitFor(() => {
      expect(result.current?.client?.baseURL).toBe('https://example.com')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    // replace store with new object before rerender
    store = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://new.com' } },
    }

    rerender({})

    await waitFor(() => {
      expect(result.current?.client?.baseURL).toBe('https://new.com')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
