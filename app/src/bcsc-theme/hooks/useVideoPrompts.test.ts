import useApi from '@/bcsc-theme/api/hooks/useApi'
import useVideoPrompts, { discardInFlightVerificationRequests, PromptsResult } from '@/bcsc-theme/hooks/useVideoPrompts'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
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
  const apiError = (status: number, context?: Record<string, unknown>) => {
    const cause = new AxiosError(`Request failed with status code ${status}`)
    cause.response = { status } as any

    return new AppError('api failure', ErrorRegistry.SERVER_ERROR, { cause, track: false, context })
  }

  /** Narrows a result to the failure that carries an error, past the `discarded` outcome. */
  const failureOf = (outcome: PromptsResult | undefined): AppError => {
    if (outcome?.ready !== false || outcome.discarded) {
      throw new Error('expected the refresh to fail')
    }

    return outcome.error
  }

  const deferred = <T>() => {
    let resolve!: (value: T) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })

    return { promise, resolve, reject }
  }

  const verificationResponse = (id: string) => ({
    id,
    sha256: `${id}-sha`,
    prompts: [{ id: 1, prompt: 'Say your name' }],
  })

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
    // The in-flight slot and generation are module-level, so one test's pending refresh must not leak
    discardInFlightVerificationRequests()

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

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(outcome).toEqual({ ready: true })
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

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(outcome).toEqual({ ready: true })
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

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(outcome).toEqual({ ready: true })
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

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(outcome?.ready).toBe(false)
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

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(outcome?.ready).toBe(false)
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

      let firstReady: PromptsResult | undefined
      let secondReady: PromptsResult | undefined
      await act(async () => {
        const firstCall = first.result.current.refreshPrompts().then((ready) => (firstReady = ready))
        const secondCall = second.result.current.refreshPrompts().then((ready) => (secondReady = ready))

        resolveFetch!({ id: 'existing-id', sha256: 'sha', prompts: [{ id: 1, prompt: 'Say your name' }] })
        await Promise.all([firstCall, secondCall])
      })

      expect(mockEvidenceApi.getVerificationRequestPrompts).toHaveBeenCalledTimes(1)
      expect(firstReady).toEqual({ ready: true })
      expect(secondReady).toEqual({ ready: true })
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

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(outcome?.ready).toBe(false)
      expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(1)
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh verification prompts'),
        expect.any(Error)
      )
      expect(failureOf(outcome).context.prompts_request).toBe('recreate')
    })

    it('reports a failed request as a 2412 that carries the cause and its HTTP context', async () => {
      // Reports used to arrive with an empty context, leaving no way to tell a rejected request from a
      // network drop or an empty set.
      const failure = apiError(429, {
        http_route: '/evidence/v1/verifications',
        http_method: 'POST',
        http_status: 429,
        http_url: '/evidence/v1/verifications',
      })
      mockEvidenceApi.createVerificationRequest.mockRejectedValue(failure)

      const { result } = renderHook(() => useVideoPrompts())

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      const error = failureOf(outcome)
      expect(error.appEvent).toBe(AppEventCode.VIDEO_PROMPTS_MISSING)
      expect(error.cause).toBe(failure)
      expect(error.context).toEqual({
        prompts_request: 'create',
        http_route: '/evidence/v1/verifications',
        http_method: 'POST',
        http_status: 429,
      })
    })

    it('labels a failed fetch of an open request as a refresh', async () => {
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id' } })
      mockEvidenceApi.getVerificationRequestPrompts.mockRejectedValue(apiError(502))

      const { result } = renderHook(() => useVideoPrompts())

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(failureOf(outcome).context.prompts_request).toBe('refresh')
    })

    it.each([
      [[], 'an empty array'],
      [undefined, 'undefined'],
      [null, 'null'],
      ['Say your name', 'string'],
      [{ 0: { id: 1, prompt: 'Say your name' } }, 'object'],
    ])('reports an unusable response whose prompts were %p as %s', async (prompts, description) => {
      // Tells the backend whether the field was dropped, sent empty or sent malformed, without logging the
      // body. A non-array with a length must not pass as a prompt set and reach TakeVideoScreen's `.map`.
      mockEvidenceApi.createVerificationRequest.mockResolvedValue({ id: 'new-id', sha256: 'sha', prompts })

      const { result } = renderHook(() => useVideoPrompts())

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      const error = failureOf(outcome)
      expect(error.appEvent).toBe(AppEventCode.VIDEO_PROMPTS_MISSING)
      expect(error.technicalMessage).toBe(`Server returned no usable prompts (prompts was ${description})`)
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS })
      )
      expect(error.context.prompts_request).toBe('create')
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

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(outcome).toEqual({ ready: true })
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

  describe('when verification is reset while a request is in flight', () => {
    const savedAnything = () =>
      mockDispatch.mock.calls.some(([action]) =>
        [
          BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
          BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_SHA,
          BCDispatchAction.UPDATE_VIDEO_PROMPTS,
        ].includes(action.type)
      )

    it.each([
      ['returns', (create: ReturnType<typeof deferred<any>>) => create.resolve(verificationResponse('old-id'))],
      ['fails', (create: ReturnType<typeof deferred<any>>) => create.reject(apiError(401))],
    ])(
      'discards a created request that %s after the reset, saving nothing and raising no 2412',
      async (_name, settle) => {
        const create = deferred<any>()
        mockEvidenceApi.createVerificationRequest.mockReturnValue(create.promise)
        const { result } = renderHook(() => useVideoPrompts())

        let outcome: PromptsResult | undefined
        await act(async () => {
          const pending = result.current.refreshPrompts().then((value) => (outcome = value))
          discardInFlightVerificationRequests()
          settle(create)
          await pending
        })

        expect(outcome).toEqual({ ready: false, discarded: true })
        expect(savedAnything()).toBe(false)
        expect(setAuthorizationRequest).not.toHaveBeenCalled()
        expect(mockLogger.error).not.toHaveBeenCalled()
      }
    )

    it('does not create a replacement when the open id is rejected with a 500 after the reset', async () => {
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id' } })
      const fetch = deferred<any>()
      mockEvidenceApi.getVerificationRequestPrompts.mockReturnValue(fetch.promise)
      const { result } = renderHook(() => useVideoPrompts())

      let outcome: PromptsResult | undefined
      await act(async () => {
        const pending = result.current.refreshPrompts().then((value) => (outcome = value))
        discardInFlightVerificationRequests()
        fetch.reject(apiError(500))
        await pending
      })

      expect(outcome).toEqual({ ready: false, discarded: true })
      expect(mockEvidenceApi.createVerificationRequest).not.toHaveBeenCalled()
    })

    it('discards a request whose persist finishes after the reset, without dispatching its prompts', async () => {
      mockEvidenceApi.createVerificationRequest.mockResolvedValue(verificationResponse('old-id'))
      // The reset lands while the native write is still running
      jest.mocked(setAuthorizationRequest).mockImplementationOnce(async () => {
        discardInFlightVerificationRequests()
        return true
      })
      const { result } = renderHook(() => useVideoPrompts())

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.refreshPrompts()
      })

      expect(setAuthorizationRequest).toHaveBeenCalled()
      expect(outcome).toEqual({ ready: false, discarded: true })
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS })
      )
    })

    it('opens its own request after the reset instead of joining the discarded one', async () => {
      const oldCreate = deferred<any>()
      const newCreate = deferred<any>()
      mockEvidenceApi.createVerificationRequest
        .mockReturnValueOnce(oldCreate.promise)
        .mockReturnValueOnce(newCreate.promise)
      const { result } = renderHook(() => useVideoPrompts())

      let oldOutcome: PromptsResult | undefined
      let newOutcome: PromptsResult | undefined
      let joinedOutcome: PromptsResult | undefined
      await act(async () => {
        const oldCall = result.current.refreshPrompts().then((value) => (oldOutcome = value))
        discardInFlightVerificationRequests()
        const newCall = result.current.refreshPrompts().then((value) => (newOutcome = value))
        expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(2)

        // The old response settling must not clear the new request's slot, so a third call joins it
        oldCreate.resolve(verificationResponse('old-id'))
        await oldCall
        const joinedCall = result.current.refreshPrompts().then((value) => (joinedOutcome = value))
        expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(2)

        newCreate.resolve(verificationResponse('new-id'))
        await Promise.all([newCall, joinedCall])
      })

      expect(oldOutcome).toEqual({ ready: false, discarded: true })
      expect(newOutcome).toEqual({ ready: true })
      expect(joinedOutcome).toEqual({ ready: true })
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: ['new-id'],
      })
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: ['old-id'],
      })
    })

    it('never lets the discarded response overwrite the new one when it lands last', async () => {
      const oldCreate = deferred<any>()
      const newCreate = deferred<any>()
      mockEvidenceApi.createVerificationRequest
        .mockReturnValueOnce(oldCreate.promise)
        .mockReturnValueOnce(newCreate.promise)
      const { result } = renderHook(() => useVideoPrompts())

      await act(async () => {
        const oldCall = result.current.refreshPrompts()
        discardInFlightVerificationRequests()
        const newCall = result.current.refreshPrompts()

        newCreate.resolve(verificationResponse('new-id'))
        await newCall
        oldCreate.resolve(verificationResponse('old-id'))
        await oldCall
      })

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: ['new-id'],
      })
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_ID,
        payload: ['old-id'],
      })
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

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.ensureVerificationRequest()
      })

      expect(outcome).toEqual({ ready: true })
      expect(mockEvidenceApi.createVerificationRequest).toHaveBeenCalledTimes(1)
    })

    it('makes no request at all when one is already open', async () => {
      mockStoreWith({ bcscSecure: { verificationRequestId: 'existing-id', verificationRequestSha: 'sha' } })

      const { result } = renderHook(() => useVideoPrompts())

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.ensureVerificationRequest()
      })

      expect(outcome).toEqual({ ready: true })
      expect(mockEvidenceApi.createVerificationRequest).not.toHaveBeenCalled()
      expect(mockEvidenceApi.getVerificationRequestPrompts).not.toHaveBeenCalled()
    })

    it('reports failure when the create fails', async () => {
      mockEvidenceApi.createVerificationRequest.mockRejectedValue(new Error('rate limited'))

      const { result } = renderHook(() => useVideoPrompts())

      let outcome: PromptsResult | undefined
      await act(async () => {
        outcome = await result.current.ensureVerificationRequest()
      })

      expect(outcome?.ready).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh verification prompts'),
        expect.any(Error)
      )
    })
  })
})
