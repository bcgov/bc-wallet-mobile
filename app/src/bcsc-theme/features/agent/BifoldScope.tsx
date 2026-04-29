import { AgentProvider, OpenIDCredentialRecordProvider } from '@bifold/core'
import React, { PropsWithChildren } from 'react'
import { useBCSCAgent } from './BCSCAgentProvider'

/**
 * Scopes children into Bifold's agent + OpenID providers using the live agent
 * from BCSC's useBCSCAgent. Bifold screens (e.g. CredentialStack/ListCredentials)
 * call useAgent() and useOpenIDCredentials() unconditionally, so they need
 * these providers in the tree to mount without crashing.
 *
 * BCSC's BCSCAgentProvider is intentionally non-blocking and decoupled from
 * Bifold's hook surface — this bridge is the seam where we re-enter Bifold's
 * universe just for the screens we reuse from upstream.
 *
 * Until the agent is ready the bridge renders nothing; the wallet tab falls
 * back to a blank state, which is acceptable because users will not have
 * credentials at v4.1 launch.
 */
const BifoldScope: React.FC<PropsWithChildren> = ({ children }) => {
  const { agent } = useBCSCAgent()

  if (!agent) {
    return null
  }

  return (
    <AgentProvider agent={agent}>
      <OpenIDCredentialRecordProvider>{children}</OpenIDCredentialRecordProvider>
    </AgentProvider>
  )
}

export default BifoldScope
