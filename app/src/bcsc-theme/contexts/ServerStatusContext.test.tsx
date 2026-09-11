import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import * as Bifold from '@bifold/core'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import React from 'react'
import { ServerStatusProvider, useServerStatus } from './ServerStatusContext'

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')

const mockGetServerStatus = jest.fn()
jest.mock('@/bcsc-theme/api/hooks/useConfigApi', () => () => ({
  getServerStatus: mockGetServerStatus,
}))

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return { ...actual, useStore: jest.fn(), useServices: jest.fn() }
})

const mockUseBCSCApiClientState = jest.mocked(useBCSCApiClientState)
const mockDispatch = jest.fn()
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }

const wrapper = ({ children }: { children: React.ReactNode }) => <ServerStatusProvider>{children}</ServerStatusProvider>
const renderProvider = () => renderHook(() => useServerStatus(), { wrapper })

describe('ServerStatusProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold.useStore).mockReturnValue([{} as never, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as never)
    mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true } as never)
    mockGetServerStatus.mockResolvedValue({ status: 'ok' })
  })

  it('does not fetch until the API client is ready', () => {
    mockUseBCSCApiClientState.mockReturnValue({ client: null, isClientReady: false } as never)

    const { result } = renderProvider()

    expect(mockGetServerStatus).not.toHaveBeenCalled()
    expect(result.current.hasChecked).toBe(false)
    expect(result.current.isAvailable).toBe(true) // fails open
  })

  it('fetches on mount and reports available for an ok status', async () => {
    const { result } = renderProvider()

    await waitFor(() => expect(result.current.hasChecked).toBe(true))
    expect(mockGetServerStatus).toHaveBeenCalledTimes(1)
    expect(result.current.isAvailable).toBe(true)
  })

  it('reports unavailable with the status message when the server is down', async () => {
    mockGetServerStatus.mockResolvedValue({ status: 'unavailable', statusMessage: 'Down for maintenance' })

    const { result } = renderProvider()

    await waitFor(() => expect(result.current.hasChecked).toBe(true))
    expect(result.current.isAvailable).toBe(false)
    expect(result.current.statusMessage).toBe('Down for maintenance')
  })

  it('fails open and still marks hasChecked when the fetch throws', async () => {
    const error = new Error('network')
    mockGetServerStatus.mockRejectedValue(error)

    const { result } = renderProvider()

    await waitFor(() => expect(result.current.hasChecked).toBe(true))
    expect(result.current.isAvailable).toBe(true)
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('failed to fetch'), error)
  })

  it('refresh() returns the cached value without hitting the network', async () => {
    const { result } = renderProvider()
    await waitFor(() => expect(result.current.hasChecked).toBe(true))

    await act(async () => {
      await result.current.refresh()
    })

    expect(mockGetServerStatus).toHaveBeenCalledTimes(1)
  })

  it('refresh({ force: true }) re-fetches', async () => {
    const { result } = renderProvider()
    await waitFor(() => expect(result.current.hasChecked).toBe(true))

    await act(async () => {
      await result.current.refresh({ force: true })
    })

    expect(mockGetServerStatus).toHaveBeenCalledTimes(2)
  })

  it('dispatches the outage banner when the server is down', async () => {
    mockGetServerStatus.mockResolvedValue({ status: 'unavailable', statusMessage: 'Down' })

    const { result } = renderProvider()
    await waitFor(() => expect(result.current.hasChecked).toBe(true))

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: [expect.objectContaining({ id: BCSCBanner.IAS_SERVER_UNAVAILABLE })],
      })
    )
  })
})
