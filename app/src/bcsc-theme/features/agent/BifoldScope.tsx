import { AgentProvider, OpenIDCredentialRecordProvider } from '@bifold/core'
import React, { PropsWithChildren } from 'react'
import { useBCSCAgent } from './BCSCAgentProvider'

/**
 * Scopes children into Bifold's agent + OpenID providers using the live agent
 * from BCSC's useBCSCAgent. Bifold screens (e.g. CredentialStack/ListCredentials,
 * CredentialDetails) call useAgent() and useOpenIDCredentials() unconditionally,
 * so they need these providers in the tree to mount without crashing.
 *
 * BCSC's BCSCAgentProvider is intentionally non-blocking and decoupled from
 * Bifold's hook surface — this bridge is the seam where we re-enter Bifold's
 * universe just for the screens we reuse from upstream.
 *
 * When the agent is not yet ready the providers are skipped but children still
 * render — callers that mount Bifold screens must guard against the unready
 * state themselves (e.g. the Wallet tab returns null until the agent is up).
 * Skipping providers means BCSC's own screens (settings, account, etc.) can
 * render normally during early app boot when this scope wraps the MainStack.
 */
const BifoldScope: React.FC<PropsWithChildren> = ({ children }) => {
  const { agent } = useBCSCAgent()

  if (!agent) {
    return <>{children}</>
  }

  return (
    <AgentProvider agent={agent}>
      <OpenIDCredentialRecordProvider>{children}</OpenIDCredentialRecordProvider>
    </AgentProvider>
  )
}

export default BifoldScope
