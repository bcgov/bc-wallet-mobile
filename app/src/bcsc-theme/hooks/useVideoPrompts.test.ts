import useApi from '@/bcsc-theme/api/hooks/useApi'
import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { setAuthorizationRequest } from 'react-native-bcsc-core'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

describe('useVideoPrompts', () => {
  const mockDispatch = jest.fn()
  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }

  const mockEvidenceApi = {
    createVerificationRequest: jest.fn(),
    getVerificationRequestPrompts: jest.fn(),
  }

  /**
   * The shape the API client actually throws: an AppError wrapping the AxiosError.
   *
   * The status matters — only a 500 means IAS has deleted the request server-side. Anything else leaves
   * the id usable, so the hook must not replace it.
   */
  const apiError = (status: number) => {
    const cause = new AxiosError(`Request failed with status code ${status}`)
    cause.response = { status } as any

    return new AppError('api failure', ErrorRegistry.SERVER_ERROR, { cause, track: false })
  }

  const baseStore: any = {
    bcsc: { prompts: [] },
    bcscSecure: { verificationRequestId: undefined, verificationRequestSha: undefined },
  }

  const mockStoreWith = (overrides: any = {}) => {
    jest.mocked(Bifold).useStore.mockReturnValue([
      {
        ...baseStore,
        ...overrides,
        bcscSecure: { ...baseStore.bcscSecure, ...(overrides.bcscSecure ?? {}) },
      },
      mockDispatch,
    ])
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jest.mocked(useApi).mockReturnValue({ evidence: mockEvidenceApi } as any)
    jest.mocked(Bifold).useServices.mockReturnValue([mockLogger] as any)
    mockStoreWith()
  })

  describe('refreshPrompts', () => {
    it('rotates the prompt set of an open request, persisting the new sha alongside it', async () => {
      // The sha is bound to the prompts it arrived with — persisting one without the other strands the
      // upload, which finalizes against the stored sha.
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id', verificationRequestSha: 'old-sha' } })
      const fetched = { id: 'existing-id', sha256: 'fresh-sha', prompts: [{ id: 1, prompt: 'Say your name' }] }
      mockEvidenceApi.getVerificationRequestPrompts.mockResolvedValue(fetched)

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.refreshPrompts()
      })

      expect(ready).toBe(true)
      expect(mockEvidenceApi.getVerificationRequestPrompts).toHaveBeenCalledWith('existing-id')
      expect(mockEvidenceApi.createVerificationRequest).not.toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA,
        payload: ['fresh-sha'],
      })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_VIDEO_PROMPTS,
        payload: [fetched.prompts],
      })
    })

    it('refreshes even when a full prompt set is already cached', async () => {
      // The whole point of the control: a retake must answer a challenge the user has not seen. A cached
      // set is exactly what must not be reused.
      mockStoreWith({
        bcsc: { prompts: [{ id: 1, prompt: 'Stale prompt' }] },
        bcscSecure: { verificationRequestId: 'existing-id', verificationRequestSha: 'cached-sha' },
      })
      mockEvidenceApi.getVerificationRequestPrompts.mockResolvedValue({
        id: 'existing-id',
        sha256: 'fresh-sha',
        prompts: [{ id: 2, prompt: 'Look left' }],
      })

      const { result } = renderHook(() => useVideoPrompts())

      await act(async () => {
        await result.current.refreshPrompts()
      })

      expect(mockEvidenceApi.getVerificationRequestPrompts).toHaveBeenCalledWith('existing-id')
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_VIDEO_PROMPTS,
        payload: [[{ id: 2, prompt: 'Look left' }]],
      })
    })

    it('creates a request when none is open yet', async () => {
      mockEvidenceApi.createVerificationRequest.mockResolvedValue({
        id: 'new-id',
        sha256: 'new-sha',
        prompts: [{ id: 1, prompt: 'Say your name' }],
      })

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.refreshPrompts()
      })

      expect(ready).toBe(true)
      expect(mockEvidenceApi.getVerificationRequestPrompts).not.toHaveBeenCalled()
      expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(1)
    })

    it('recovers from a stale id by creating a fresh verification request on a 500', async () => {
      // IAS returns 500 for a verification id it has already deleted (TTL, agent cancelled).
      mockStoreWith({ bcscSecure: { verificationRequestId: 'stale-id' } })
      mockEvidenceApi.getVerificationRequestPrompts.mockRejectedValue(apiError(500))
      mockEvidenceApi.createVerificationRequest.mockResolvedValue({
        id: 'fresh-id',
        sha256: 'fresh-sha',
        prompts: [{ id: 1, prompt: 'Say your name' }],
      })

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.refreshPrompts()
      })

      expect(ready).toBe(true)
      expect(mockEvidenceApi.getVerificationRequestPrompts).toHaveBeenCalledWith('stale-id')
      expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(1)
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: ['fresh-id'],
      })
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('creating a fresh request'))
    })

    it.each([
      ['a timeout', 408],
      ['an expired token', 401],
      ['a transient gateway failure', 502],
    ])('keeps the open request and does not burn a create on %s', async (_label, status) => {
      // Only a 500 means the id is gone. Replacing it for anything else orphans a live request and
      // spends rate-limit budget the server enforces — on every focus and every retake.
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id' } })
      mockEvidenceApi.getVerificationRequestPrompts.mockRejectedValue(apiError(status))

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.refreshPrompts()
      })

      expect(ready).toBe(false)
      expect(mockEvidenceApi.createVerificationRequest).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID })
      )
    })

    it('reports failure without clearing the cached prompts when the server returns an empty set', async () => {
      // Regression for #4018, and TakeVideoScreen hard-throws on an empty set while still mounted beneath
      // the retake screens — clearing here would crash the screen the caller is about to return to.
      mockStoreWith({
        bcsc: { prompts: [{ id: 1, prompt: 'Previous prompt' }] },
        bcscSecure: { verificationRequestId: 'existing-id', verificationRequestSha: 'old-sha' },
      })
      mockEvidenceApi.getVerificationRequestPrompts.mockResolvedValue({ id: 'existing-id', sha256: 'sha', prompts: [] })

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.refreshPrompts()
      })

      expect(ready).toBe(false)
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS })
      )
    })

    it('nulls the sha of an unusable response rather than pairing it with the cached prompts', async () => {
      // The prompts above are deliberately kept, so committing this response's sha would leave the store
      // holding a pair the server never issued: a recording answering the old prompts would finalize
      // against the new sha. useEvidenceUploadModel recovers from a missing sha but cannot see a wrong
      // one, so null is the only safe value here.
      mockStoreWith({
        bcsc: { prompts: [{ id: 1, prompt: 'Previous prompt' }] },
        bcscSecure: { verificationRequestId: 'existing-id', verificationRequestSha: 'old-sha' },
      })
      mockEvidenceApi.getVerificationRequestPrompts.mockResolvedValue({
        id: 'existing-id',
        sha256: 'rotated-sha',
        prompts: [],
      })

      const { result } = renderHook(() => useVideoPrompts())

      await act(async () => {
        await result.current.refreshPrompts()
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA,
        payload: [null],
      })
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA,
        payload: ['rotated-sha'],
      })
    })

    it('joins a refresh already in flight rather than rotating the set a second time', async () => {
      // Every GET rotates the server's set. Each screen holds its own instance of this hook, so without
      // sharing the in-flight call two gateways refreshing at once would each rotate, and their store
      // writes would race — landing the sha from one response beside the prompts from another.
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id' } })
      let resolveFetch: (value: any) => void
      mockEvidenceApi.getVerificationRequestPrompts.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve
        })
      )

      const first = renderHook(() => useVideoPrompts())
      const second = renderHook(() => useVideoPrompts())

      let firstReady: boolean | undefined
      let secondReady: boolean | undefined
      await act(async () => {
        const firstCall = first.result.current.refreshPrompts().then((ready) => (firstReady = ready))
        const secondCall = second.result.current.refreshPrompts().then((ready) => (secondReady = ready))

        resolveFetch!({ id: 'existing-id', sha256: 'sha', prompts: [{ id: 1, prompt: 'Say your name' }] })
        await Promise.all([firstCall, secondCall])
      })

      expect(mockEvidenceApi.getVerificationRequestPrompts).toHaveBeenCalledTimes(1)
      expect(firstReady).toBe(true)
      expect(secondReady).toBe(true)
    })

    it('starts a new rotation once the previous refresh has settled', async () => {
      // The in-flight call is shared, not cached — a later gateway still needs its own fresh set.
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id' } })
      mockEvidenceApi.getVerificationRequestPrompts.mockResolvedValue({
        id: 'existing-id',
        sha256: 'sha',
        prompts: [{ id: 1, prompt: 'Say your name' }],
      })

      const { result } = renderHook(() => useVideoPrompts())

      await act(async () => {
        await result.current.refreshPrompts()
      })
      await act(async () => {
        await result.current.refreshPrompts()
      })

      expect(mockEvidenceApi.getVerificationRequestPrompts).toHaveBeenCalledTimes(2)
    })

    it('keeps the request id of an unusable response so the next attempt can recover without a create', async () => {
      // Dropping the id would send the next Send Video press back through createVerificationRequest,
      // which the server rate limits.
      mockEvidenceApi.createVerificationRequest.mockResolvedValue({ id: 'new-id', sha256: 'new-sha', prompts: [] })

      const { result } = renderHook(() => useVideoPrompts())

      await act(async () => {
        await result.current.refreshPrompts()
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: ['new-id'],
      })
    })

    it('reports failure when both the fetch and the fallback create fail', async () => {
      mockStoreWith({ bcscSecure: { verificationRequestId: 'stale-id' } })
      mockEvidenceApi.getVerificationRequestPrompts.mockRejectedValue(apiError(500))
      mockEvidenceApi.createVerificationRequest.mockRejectedValue(new Error('offline'))

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.refreshPrompts()
      })

      expect(ready).toBe(false)
      expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(1)
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh verification prompts'),
        expect.any(Error)
      )
    })

    it('keeps a stable identity across a re-render once the request id lands', async () => {
      // Callers drive this from a focus effect. An identity that changed when the id arrived would
      // re-arm the effect and fetch a second time, rotating the set the user is already reading.
      const { result, rerender } = renderHook(() => useVideoPrompts())
      const before = result.current.refreshPrompts

      mockStoreWith({ bcscSecure: { verificationRequestId: 'new-id' } })
      rerender({})

      expect(result.current.refreshPrompts).toBe(before)
    })

    it('still reports success when persisting the request id fails', async () => {
      // The id and sha are dispatched to the store before native storage is touched, and the sha is
      // memory-only by design, so a failed write costs the id on the next app cycle and nothing more.
      // Failing the refresh over it would block Send Video, Retake and VideoInstructions outright.
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id' } })
      const fetched = { id: 'existing-id', sha256: 'fresh-sha', prompts: [{ id: 1, prompt: 'Say your name' }] }
      mockEvidenceApi.getVerificationRequestPrompts.mockResolvedValue(fetched)
      jest.mocked(setAuthorizationRequest).mockRejectedValueOnce(new Error('device storage is full'))

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.refreshPrompts()
      })

      expect(ready).toBe(true)
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_VIDEO_PROMPTS,
        payload: [fetched.prompts],
      })
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to persist'))
    })

    it('tracks the in-flight refresh so callers can block actions bound to the outgoing sha', async () => {
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id' } })
      let resolveFetch: (value: any) => void
      mockEvidenceApi.getVerificationRequestPrompts.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve
        })
      )

      const { result } = renderHook(() => useVideoPrompts())

      expect(result.current.isRefreshingPrompts).toBe(false)

      act(() => {
        result.current.refreshPrompts()
      })

      expect(result.current.isRefreshingPrompts).toBe(true)

      await act(async () => {
        resolveFetch!({ id: 'existing-id', sha256: 'sha', prompts: [{ id: 1, prompt: 'Say your name' }] })
      })

      expect(result.current.isRefreshingPrompts).toBe(false)
    })
  })

  describe('ensureVerificationRequest', () => {
    it('creates a request when none is open', async () => {
      mockEvidenceApi.createVerificationRequest.mockResolvedValue({
        id: 'new-id',
        sha256: 'new-sha',
        prompts: [{ id: 1, prompt: 'Say your name' }],
      })

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.ensureVerificationRequest()
      })

      expect(ready).toBe(true)
      expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(1)
    })

    it('makes no request at all when one is already open', async () => {
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id', verificationRequestSha: 'sha' } })

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.ensureVerificationRequest()
      })

      expect(ready).toBe(true)
      expect(mockEvidenceApi.createVerificationRequest).not.toHaveBeenCalled()
      expect(mockEvidenceApi.getVerificationRequestPrompts).not.toHaveBeenCalled()
    })

    it('reports failure when the create fails', async () => {
      mockEvidenceApi.createVerificationRequest.mockRejectedValue(new Error('rate limited'))

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.ensureVerificationRequest()
      })

      expect(ready).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh verification prompts'),
        expect.any(Error)
      )
    })
  })
})
