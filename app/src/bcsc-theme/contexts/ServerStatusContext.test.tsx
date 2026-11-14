import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import React from 'react'
import { AppState, AppStateStatus } from 'react-native'
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
const mockClient = { recordServerTime: jest.fn(), setClockCheck: jest.fn() }

const wrapper = ({ children }: { children: React.ReactNode }) => <ServerStatusProvider>{children}</ServerStatusProvider>
const renderProvider = () => renderHook(() => useServerStatus(), { wrapper })

describe('ServerStatusProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold.useStore).mockReturnValue([{} as never, mockDispatch])
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as never)
    mockUseBCSCApiClientState.mockReturnValue({ client: mockClient, isClientReady: true } as never)
    mockGetServerStatus.mockResolvedValue({ status: 'ok' })
  })

  describe('clock reading', () => {
    it('records the server time from each status fetch on the client', async () => {
      const serverTimestamp = new Date('2026-11-04T19:41:17Z')
      mockGetServerStatus.mockResolvedValue({ status: 'ok', serverTimestamp })

      const { result } = renderProvider()
      await waitFor(() => expect(result.current.hasChecked).toBe(true))

      expect(mockClient.recordServerTime).toHaveBeenCalledWith(serverTimestamp)
    })

    it('forgets the reading when the status fetch fails, so token requests are not refused on a stale one', async () => {
      mockGetServerStatus.mockRejectedValue(new Error('network'))

      const { result } = renderProvider()
      await waitFor(() => expect(result.current.hasChecked).toBe(true))

      expect(mockClient.recordServerTime).toHaveBeenCalledWith(undefined)
    })

    it('registers its status fetch as the check a token request runs when there is no reading', async () => {
      const { result } = renderProvider()
      await waitFor(() => expect(result.current.hasChecked).toBe(true))

      const clockCheck = mockClient.setClockCheck.mock.lastCall?.[0]
      await act(async () => {
        await clockCheck()
      })

      expect(mockGetServerStatus).toHaveBeenCalledTimes(2)
    })

    it('ignores a status fetch that started before the app went to the background', async () => {
      let appStateCallback: (state: AppStateStatus) => void = () => undefined
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
        appStateCallback = callback as (state: AppStateStatus) => void
        return { remove: jest.fn() } as any
      })
      let resolveStaleFetch: (status: unknown) => void = () => undefined
      mockGetServerStatus.mockReturnValueOnce(new Promise((resolve) => (resolveStaleFetch = resolve)))
      const staleTimestamp = new Date('2026-11-04T19:00:00Z')
      const freshTimestamp = new Date('2026-11-04T19:41:17Z')

      const { result } = renderProvider()
      act(() => appStateCallback('background'))

      // The fetch on return starts fresh rather than joining the one from before
      mockGetServerStatus.mockResolvedValue({ status: 'ok', serverTimestamp: freshTimestamp })
      await act(async () => {
        appStateCallback('active')
      })
      expect(mockGetServerStatus).toHaveBeenCalledTimes(2)

      await act(async () => {
        resolveStaleFetch({ status: 'ok', serverTimestamp: staleTimestamp })
      })

      expect(mockClient.recordServerTime).not.toHaveBeenCalledWith(staleTimestamp)
      expect(mockClient.recordServerTime).toHaveBeenLastCalledWith(freshTimestamp)
      expect(result.current.serverStatus?.serverTimestamp).toBe(freshTimestamp)
    })

    it('forgets the reading when the app goes to the background, and takes a new one on return', async () => {
      let appStateCallback: (state: AppStateStatus) => void = () => undefined
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
        appStateCallback = callback as (state: AppStateStatus) => void
        return { remove: jest.fn() } as any
      })
      const serverTimestamp = new Date('2026-11-04T19:41:17Z')
      mockGetServerStatus.mockResolvedValue({ status: 'ok', serverTimestamp })

      const { result } = renderProvider()
      await waitFor(() => expect(result.current.hasChecked).toBe(true))
      mockClient.recordServerTime.mockClear()

      act(() => appStateCallback('background'))
      expect(mockClient.recordServerTime).toHaveBeenCalledWith()

      await act(async () => {
        appStateCallback('active')
      })
      expect(mockClient.recordServerTime).toHaveBeenLastCalledWith(serverTimestamp)
    })
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

  it('fails null and still marks hasChecked when the fetch throws', async () => {
    const error = new Error('network')
    mockGetServerStatus.mockRejectedValue(error)

    const { result } = renderProvider()

    await waitFor(() => expect(result.current.hasChecked).toBe(true))
    expect(result.current.isAvailable).toBe(null)
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

  it('re-fetches when the app returns to the foreground', async () => {
    let appStateCallback: (state: AppStateStatus) => void = () => undefined
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
      appStateCallback = callback as (state: AppStateStatus) => void
      return { remove: jest.fn() } as any
    })

    const { result } = renderProvider()
    await waitFor(() => expect(result.current.hasChecked).toBe(true))
    expect(mockGetServerStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      appStateCallback('background')
      appStateCallback('active')
    })

    expect(mockGetServerStatus).toHaveBeenCalledTimes(2)
  })

  it('does not fetch on foreground return before the client is ready', () => {
    mockUseBCSCApiClientState.mockReturnValue({ client: null, isClientReady: false } as never)
    const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener')

    renderProvider()

    expect(addEventListenerSpy).not.toHaveBeenCalled()
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

  it('summarizes a service notice in a one-line warning banner, leaving the message to the notice screen', async () => {
    mockGetServerStatus.mockResolvedValue({ status: 'ok', statusMessage: 'Scheduled maintenance on Saturday' })

    const { result } = renderProvider()
    await waitFor(() => expect(result.current.hasChecked).toBe(true))

    expect(mockDispatch).toHaveBeenCalledWith({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.IAS_SERVER_NOTIFICATION,
          title: 'BCSC.SystemChecks.ServerStatus.NoticeBannerTitle',
          type: 'warning',
          dismissible: false,
        },
      ],
    })
    expect(result.current.statusMessage).toBe('Scheduled maintenance on Saturday')
  })
})
