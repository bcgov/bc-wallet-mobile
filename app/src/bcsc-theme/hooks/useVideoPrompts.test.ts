import useApi from '@/bcsc-theme/api/hooks/useApi'
import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'

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

    it('recovers from a stale id by creating a fresh verification request when the fetch fails', async () => {
      // IAS returns 500 for a verification id it has already deleted (TTL, agent cancelled).
      mockStoreWith({ bcscSecure: { verificationRequestId: 'stale-id' } })
      mockEvidenceApi.getVerificationRequestPrompts.mockRejectedValue(new Error('Request failed with status code 500'))
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
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id' } })
      mockEvidenceApi.getVerificationRequestPrompts.mockRejectedValue(new Error('offline'))
      mockEvidenceApi.createVerificationRequest.mockRejectedValue(new Error('offline'))

      const { result } = renderHook(() => useVideoPrompts())

      let ready: boolean | undefined
      await act(async () => {
        ready = await result.current.refreshPrompts()
      })

      expect(ready).toBe(false)
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh verification prompts'),
        expect.any(Error)
      )
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
        expect.stringContaining('Failed to create verification request'),
        expect.any(Error)
      )
    })
  })
})
