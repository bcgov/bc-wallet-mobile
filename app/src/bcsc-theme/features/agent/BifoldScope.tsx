import { AgentProvider } from '@bifold/core'
import React, { PropsWithChildren } from 'react'
import { useBCSCAgent } from './BCSCAgentProvider'

const BifoldScope: React.FC<PropsWithChildren> = ({ children }) => {
  const { agent } = useBCSCAgent()

  return <AgentProvider agent={agent ?? undefined}>{children}</AgentProvider>
}

export default BifoldScope
