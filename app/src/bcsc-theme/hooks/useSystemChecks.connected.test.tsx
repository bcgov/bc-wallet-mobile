import { BasicAppContext } from '@mocks/helpers/app'
import { act, render, renderHook, waitFor } from '@testing-library/react-native'
import React from 'react'
import { SystemCheckSessionProvider } from '../contexts/SystemCheckSessionContext'
import { SystemCheckScope, useSystemChecks } from './useSystemChecks'

// Runs under the real app context and SystemCheckSessionProvider; useSystemChecks.test.tsx mocks those instead
jest.mock('@react-navigation/native')
jest.mock('./useBCSCApiClient', () => ({
  useBCSCApiClientState: () => ({ client: {}, isClientReady: true }),
}))
jest.mock('../services/hooks/useTokenService', () => ({
  useTokenService: () => ({ getCachedIdTokenMetadata: jest.fn() }),
}))
jest.mock('@/services/system-checks/InternetStatusSystemCheck', () => ({
  InternetStatusSystemCheck: class InternetStatusSystemCheck {},
}))
jest.mock('@/services/system-checks/EventReasonAlertsSystemCheck', () => ({
  EventReasonAlertsSystemCheck: class EventReasonAlertsSystemCheck {},
}))

const mockRunSystemChecks = jest.fn()
jest.mock('@/services/system-checks/system-checks', () => ({
  runSystemChecks: (...args: unknown[]) => mockRunSystemChecks(...args),
}))

type ScopeDefinition = {
  getSystemChecks: jest.Mock
  isReady: boolean
  isApplicable: boolean
  sessionKey?: string
  decidesHomeCard?: boolean
}
let mockScopes: Record<SystemCheckScope, ScopeDefinition>
jest.mock('./useCreateSystemChecks', () => ({
  useCreateSystemChecks: () => mockScopes,
}))

const scope = (overrides: Partial<ScopeDefinition> = {}): ScopeDefinition => ({
  getSystemChecks: jest.fn().mockResolvedValue([]),
  isReady: true,
  isApplicable: true,
  ...overrides,
})

/** A batch whose completion the test controls. */
const deferred = () => {
  let resolve: (results: boolean[]) => void = () => undefined
  const promise = new Promise<boolean[]>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve))

/** Stands in for a navigator calling the hook: records every rendered `hasSettled`. */
const Probe = ({ scope: checked, onRender }: { scope: SystemCheckScope; onRender: (hasSettled: boolean) => void }) => {
  const { hasSettled } = useSystemChecks(checked)
  onRender(hasSettled)

  return null
}

type HarnessProps = {
  scope: SystemCheckScope
  /** Whether the navigator is mounted; false between a verify → main → verify round trip's two Home mounts. */
  mounted?: boolean
  /** Whether a session is active, as RootStack tells the provider. */
  enabled?: boolean
  onRender: (hasSettled: boolean) => void
}

const Harness = ({ scope: checked, mounted = true, enabled = true, onRender }: HarnessProps) => (
  <BasicAppContext>
    <SystemCheckSessionProvider enabled={enabled}>
      {mounted ? <Probe scope={checked} onRender={onRender} /> : null}
    </SystemCheckSessionProvider>
  </BasicAppContext>
)

const renderProbe = (props: Omit<HarnessProps, 'onRender'>) => {
  const onRender = jest.fn()
  let current = { ...props, onRender }
  const utils = render(<Harness {...current} />)
  /** Every `hasSettled` rendered so far, in order */
  const rendered = (): boolean[] => onRender.mock.calls.map(([hasSettled]) => hasSettled)
  const update = (next: Partial<Omit<HarnessProps, 'onRender'>>) => {
    current = { ...current, ...next }
    utils.rerender(<Harness {...current} />)
  }

  return { ...utils, rendered, update }
}

describe('useSystemChecks', () => {
  beforeEach(() => {
    mockRunSystemChecks.mockResolvedValue([])
    mockScopes = {
      [SystemCheckScope.STARTUP]: scope(),
      [SystemCheckScope.MAIN_STACK]: scope({ sessionKey: 'MAIN_STACK:unverified' }),
      [SystemCheckScope.VERIFY]: scope(),
    }
  })

  it('passes on whether the batch decides the Home card, false unless the scope says so', () => {
    mockScopes = {
      ...mockScopes,
      [SystemCheckScope.MAIN_STACK]: scope({ sessionKey: 'MAIN_STACK:unverified', decidesHomeCard: true }),
    }
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BasicAppContext>
        <SystemCheckSessionProvider>{children}</SystemCheckSessionProvider>
      </BasicAppContext>
    )
    const decidesHomeCard = (checked: SystemCheckScope) =>
      renderHook(() => useSystemChecks(checked), { wrapper }).result.current.decidesHomeCard

    expect(decidesHomeCard(SystemCheckScope.MAIN_STACK)).toBe(true)
    expect(decidesHomeCard(SystemCheckScope.VERIFY)).toBe(false)
  })
  describe('a scope that runs once per mount (no session key)', () => {
    it('runs the batch on mount and settles once it has finished', async () => {
      const { rendered } = renderProbe({ scope: SystemCheckScope.VERIFY })

      expect(rendered()[0]).toBe(false)
      await waitFor(() => expect(rendered().at(-1)).toBe(true))
      expect(mockScopes[SystemCheckScope.VERIFY].getSystemChecks).toHaveBeenCalledTimes(1)
      expect(mockRunSystemChecks).toHaveBeenCalledTimes(1)
    })

    it('runs the batch again when the navigator mounts again', async () => {
      const { rendered, update } = renderProbe({ scope: SystemCheckScope.VERIFY })
      await waitFor(() => expect(rendered().at(-1)).toBe(true))

      update({ mounted: false })
      const remountedAt = rendered().length
      update({ mounted: true })

      expect(rendered()[remountedAt]).toBe(false)
      await waitFor(() => expect(mockRunSystemChecks).toHaveBeenCalledTimes(2))
    })

    it('waits for the scope to be ready', () => {
      mockScopes[SystemCheckScope.VERIFY] = scope({ isReady: false })

      const { rendered } = renderProbe({ scope: SystemCheckScope.VERIFY })

      expect(rendered().at(-1)).toBe(false)
      expect(mockRunSystemChecks).not.toHaveBeenCalled()
    })

    it('counts a scope that will never run as settled', () => {
      mockScopes[SystemCheckScope.VERIFY] = scope({ isReady: false, isApplicable: false })

      const { rendered } = renderProbe({ scope: SystemCheckScope.VERIFY })

      expect(rendered().at(-1)).toBe(true)
    })

    it('needs no session provider', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => <BasicAppContext>{children}</BasicAppContext>

      const { result } = renderHook(() => useSystemChecks(SystemCheckScope.VERIFY), { wrapper })

      await waitFor(() => expect(result.current.hasSettled).toBe(true))
    })
  })

  describe('a scope that runs once per session', () => {
    it('needs a session provider', () => {
      // React reports the render error as well as throwing it
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const wrapper = ({ children }: { children: React.ReactNode }) => <BasicAppContext>{children}</BasicAppContext>

      expect(() => renderHook(() => useSystemChecks(SystemCheckScope.MAIN_STACK), { wrapper })).toThrow(
        'SystemCheckSessionProvider'
      )
    })

    it('runs the batch once: a navigator that mounts again finds it settled on its first render', async () => {
      const { rendered, update } = renderProbe({ scope: SystemCheckScope.MAIN_STACK })
      expect(rendered()[0]).toBe(false)
      await waitFor(() => expect(rendered().at(-1)).toBe(true))

      update({ mounted: false })
      const remountedAt = rendered().length
      update({ mounted: true })

      expect(rendered()[remountedAt]).toBe(true)
      expect(mockRunSystemChecks).toHaveBeenCalledTimes(1)
    })

    it('runs a new batch when the key changes, as it does once the user verifies', async () => {
      const { rendered, update } = renderProbe({ scope: SystemCheckScope.MAIN_STACK })
      await waitFor(() => expect(rendered().at(-1)).toBe(true))

      mockScopes = { ...mockScopes, [SystemCheckScope.MAIN_STACK]: scope({ sessionKey: 'MAIN_STACK:verified' }) }
      update({ mounted: false })
      const remountedAt = rendered().length
      update({ mounted: true })

      expect(rendered()[remountedAt]).toBe(false)
      await waitFor(() => expect(rendered().at(-1)).toBe(true))
      expect(mockRunSystemChecks).toHaveBeenCalledTimes(2)
    })

    it('runs the batch again in the next session', async () => {
      const { rendered, update } = renderProbe({ scope: SystemCheckScope.MAIN_STACK })
      await waitFor(() => expect(rendered().at(-1)).toBe(true))

      // A lock unmounts the stack and ends the session; the unlock mounts it again
      update({ mounted: false, enabled: false })
      const remountedAt = rendered().length
      update({ mounted: true, enabled: true })

      expect(rendered()[remountedAt]).toBe(false)
      await waitFor(() => expect(mockRunSystemChecks).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(rendered().at(-1)).toBe(true))
    })

    it('waits for a batch an earlier mount started, without starting it again', async () => {
      const run = deferred()
      mockRunSystemChecks.mockReturnValueOnce(run.promise)
      const { rendered, update } = renderProbe({ scope: SystemCheckScope.MAIN_STACK })
      await waitFor(() => expect(mockRunSystemChecks).toHaveBeenCalledTimes(1))

      update({ mounted: false })
      const remountedAt = rendered().length
      update({ mounted: true })

      expect(rendered()[remountedAt]).toBe(false)
      expect(mockRunSystemChecks).toHaveBeenCalledTimes(1)

      await act(async () => {
        run.resolve([])
        await flushPromises()
      })

      expect(rendered().at(-1)).toBe(true)
    })
  })
})
