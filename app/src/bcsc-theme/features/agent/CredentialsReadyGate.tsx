import CredentialListSkeleton from '@/bcsc-theme/components/CredentialListSkeleton'
import { useCredentials } from '@bifold/react-hooks'
import { useIsFocused } from '@react-navigation/native'
import React, { PropsWithChildren } from 'react'

import AgentInitFailed from './AgentInitFailed'
import { useBCSCAgent } from './BCSCAgentProvider'

type Props = PropsWithChildren<{ testID?: string }>

/**
 * The Wallet tab's gate. Holds children behind the credential skeleton until the BCSC agent has
 * started and Credo's DIDComm credential records have finished their first load, so the tab never
 * flashes the empty state (EmptyWalletList) before an existing credential is available. BCSC
 * credentials are DIDComm AnonCreds, so useCredentials().loading is the relevant signal; once the
 * records are read it turns false even with zero credentials, and an empty wallet then renders its
 * empty state.
 *
 * Both waits return the same skeleton, so one instance covers them and its pulse does not restart
 * when the agent becomes ready. A failed agent start shows the same message and Retry as
 * {@link AgentReadyGate}.
 */
const CredentialsReadyGate: React.FC<Props> = ({ children, testID }) => {
  const { agent, error, retry } = useBCSCAgent()
  const { loading } = useCredentials()
  // A visited tab stays mounted while another tab, or a screen above the tabs, is showing.
  const isFocused = useIsFocused()

  if (!agent && error) {
    return <AgentInitFailed testID={testID} onRetry={retry} />
  }

  // `loading` follows the agent one render late, and the children call Bifold's useAgent(), which
  // throws without an agent. So the agent is checked here as well, not inferred from `loading`.
  if (!agent || loading) {
    return <CredentialListSkeleton testID={testID} active={isFocused} />
  }

  return <>{children}</>
}

export default CredentialsReadyGate
