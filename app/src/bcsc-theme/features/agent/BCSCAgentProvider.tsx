import { Agent } from '@credo-ts/core'
import React, { createContext, PropsWithChildren, useContext, useMemo } from 'react'

import { AppError } from '@/errors'

import useAgentSetupViewModel from './useAgentSetupViewModel'

export interface BCSCAgentContextValue {
  agent: Agent | null
  loading: boolean
  error: AppError | null
  retry: () => void
  resetWallet: () => Promise<void>
  teardownAgent: () => Promise<void>
  waitForAgent: () => Promise<Agent | null>
}

const BCSCAgentContext = createContext<BCSCAgentContextValue | null>(null)

/**
 * Reads the BCSC agent context. Throws if called outside of {@link BCSCAgentProvider}.
 *
 * @returns The current agent context value (`agent`, `loading`, `error`, `retry`).
 */
export const useBCSCAgent = (): BCSCAgentContextValue => {
  const ctx = useContext(BCSCAgentContext)
  if (!ctx) {
    throw new Error('useBCSCAgent must be used within a BCSCAgentProvider')
  }
  return ctx
}

/**
 * Non-throwing variant of {@link useBCSCAgent} for callers that may run outside
 * the provider tree or under a disabled provider (e.g. AuthStack, OnboardingStack)
 * and must tolerate the agent being absent.
 *
 * @returns The agent context value when mounted under an enabled provider, otherwise `null`.
 */
export const useBCSCAgentSafe = (): BCSCAgentContextValue | null => useContext(BCSCAgentContext)

/**
 * Provider that owns the BCSC Credo agent lifecycle and exposes `{ agent,
 * loading, error, retry }` to descendants.
 *
 * Non-blocking and decoupled from Bifold's AgentProvider. Children always
 * render; consumers inspect the context via {@link useBCSCAgent} and decide
 * what to show. Init failures are logged by the ViewModel — no modal, no
 * fall-through to Bifold hooks. Screens that need the live agent reach for it
 * through `useBCSCAgent().agent` rather than Bifold's `useAgent()`.
 *
 * `enabled` false keeps the agent down and exposes no context value, exactly as if
 * the provider were absent, so it can stay mounted above the root navigator while
 * the user is onboarding, locked or recovering a session.
 */
export interface BCSCAgentProviderProps extends PropsWithChildren {
  enabled?: boolean
}

const BCSCAgentProvider: React.FC<BCSCAgentProviderProps> = ({ enabled = true, children }) => {
  const { agent, status, error, retry, resetWallet, teardownAgent, waitForAgent } = useAgentSetupViewModel({ enabled })

  const value = useMemo<BCSCAgentContextValue>(
    () => ({
      agent,
      loading: status === 'idle' || status === 'initializing',
      error,
      retry,
      resetWallet,
      teardownAgent,
      waitForAgent,
    }),
    [agent, status, error, retry, resetWallet, teardownAgent, waitForAgent]
  )

  return <BCSCAgentContext.Provider value={enabled ? value : null}>{children}</BCSCAgentContext.Provider>
}

export default BCSCAgentProvider
