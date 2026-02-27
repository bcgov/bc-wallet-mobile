import BCSCApiClient from '@/bcsc-theme/api/client'
import {
  _resetBCSCApiClientSingleton,
  BCSCApiClientContext,
  BCSCApiClientProvider,
} from '@/bcsc-theme/contexts/BCSCApiClientContext'
import { ErrorAlertProvider } from '@/contexts/ErrorAlertContext'
import * as Bifold from '@bifold/core'
import { MockLogger } from '@bifold/core'
import { renderHook, waitFor } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { useContext } from 'react'
import * as FactoryReset from '../api/hooks/useFactoryReset'
import { BCSCStackProvider } from './BCSCStackContext'

jest.mock('@/bcsc-theme/api/client')

jest.mock('@bifold/core')

jest.mock('../api/hooks/useFactoryReset')

describe('BCSCApiClientProvider', () => {
  beforeEach(() => {
    _resetBCSCApiClientSingleton()
    jest.resetAllMocks()
  })

  it('should initialize the client', async () => {
    const bifoldMock = jest.mocked(Bifold)
    const bcscApiClientMock = jest.mocked(BCSCApiClient)
    const factoryResetMock = jest.mocked(FactoryReset)

    const mockStore: any = {
      stateLoaded: true,
      developer: {
        environment: {
          iasApiBaseUrl: 'https://example.com',
        },
      },
      bcscSecure: {
        refreshToken: 'mockRefreshToken',
      },
    }

    const mockLogger = new MockLogger()
    const dispatchMock = jest.fn()

    factoryResetMock.useFactoryReset.mockReturnValue(jest.fn())
    bifoldMock.useServices.mockReturnValue([mockLogger])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockResolvedValue(true)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorAlertProvider>
        <BCSCStackProvider>
          <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
        </BCSCStackProvider>
      </ErrorAlertProvider>
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
    const factoryResetMock = jest.mocked(FactoryReset)

    const mockStore: any = {
      stateLoaded: false,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
      bcscSecure: {
        refreshToken: 'mockRefreshToken',
      },
    }

    const dispatchMock = jest.fn()
    factoryResetMock.useFactoryReset.mockReturnValue(jest.fn())
    bifoldMock.useServices.mockReturnValue([{}])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockResolvedValue(true)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorAlertProvider>
        <BCSCStackProvider>
          <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
        </BCSCStackProvider>
      </ErrorAlertProvider>
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
    const factoryResetMock = jest.mocked(FactoryReset)

    const mockStore: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: '' } },
      bcscSecure: {
        refreshToken: 'mockRefreshToken',
      },
    }
    const dispatchMock = jest.fn()
    factoryResetMock.useFactoryReset.mockReturnValue(jest.fn())
    bifoldMock.useServices.mockReturnValue([{}])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockResolvedValue(true)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorAlertProvider>
        <BCSCStackProvider>
          <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
        </BCSCStackProvider>
      </ErrorAlertProvider>
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
    const factoryResetMock = jest.mocked(FactoryReset)

    const mockStore: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
      bcscSecure: {
        refreshToken: 'mockRefreshToken',
      },
    }

    const dispatchMock = jest.fn()
    const mockLogger = new MockLogger()
    factoryResetMock.useFactoryReset.mockReturnValue(jest.fn())
    bifoldMock.useServices.mockReturnValue([mockLogger])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockResolvedValue(true)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorAlertProvider>
        <BCSCStackProvider>
          <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
        </BCSCStackProvider>
      </ErrorAlertProvider>
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
    const factoryResetMock = jest.mocked(FactoryReset)

    const mockStore: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
      bcscSecure: {
        refreshToken: 'mockRefreshToken',
      },
    }
    const dispatchMock = jest.fn()
    const mockLogger = new MockLogger()
    factoryResetMock.useFactoryReset.mockReturnValue(jest.fn())
    bifoldMock.useServices.mockReturnValue([mockLogger])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest
      .fn()
      .mockRejectedValue(new Error('Initialization failed'))

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorAlertProvider>
        <BCSCStackProvider>
          <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
        </BCSCStackProvider>
      </ErrorAlertProvider>
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
    const factoryResetMock = jest.mocked(FactoryReset)

    const mockStore: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
      bcscSecure: {
        refreshToken: 'mockRefreshToken',
      },
    }
    const dispatchMock = jest.fn()
    const mockLogger = new MockLogger()
    factoryResetMock.useFactoryReset.mockReturnValue(jest.fn())
    bifoldMock.useServices.mockReturnValue([mockLogger])
    bifoldMock.useStore.mockReturnValue([mockStore, dispatchMock])

    const mockError: any = new AxiosError()
    mockError.isNetworkError = true

    bcscApiClientMock.prototype.fetchEndpointsAndConfig = jest.fn().mockRejectedValue(mockError)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorAlertProvider>
        <BCSCStackProvider>
          <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
        </BCSCStackProvider>
      </ErrorAlertProvider>
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
    const factoryResetMock = jest.mocked(FactoryReset)
    const fetchMock = jest.fn()

    let store: any = {
      stateLoaded: true,
      developer: { environment: { iasApiBaseUrl: 'https://example.com' } },
      bcscSecure: {
        refreshToken: 'mockRefreshToken',
      },
    }
    const dispatchMock = jest.fn()
    const mockLogger = new MockLogger()
    factoryResetMock.useFactoryReset.mockReturnValue(jest.fn())
    bifoldMock.useServices.mockReturnValue([mockLogger])
    bifoldMock.useStore.mockImplementation(() => [store, dispatchMock])

    bcscApiClientMock.mockImplementation(
      () =>
        ({
          fetchEndpointsAndConfig: fetchMock,
          setErrorHandler: jest.fn(),
          baseURL: store.developer.environment.iasApiBaseUrl,
        }) as any
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorAlertProvider>
        <BCSCStackProvider>
          <BCSCApiClientProvider>{children}</BCSCApiClientProvider>
        </BCSCStackProvider>
      </ErrorAlertProvider>
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
      bcscSecure: {
        refreshToken: 'mockRefreshToken',
      },
    }

    rerender({})

    await waitFor(() => {
      expect(result.current?.client?.baseURL).toBe('https://new.com')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
